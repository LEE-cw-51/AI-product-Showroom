import { analysisSchema, type ProductAnalysis } from "../ai/schemas/analysis.ts";
import {
  showroomContentSchema,
  type ShowroomContent,
} from "../ai/schemas/showroom.ts";
import type { ShowroomQaResult } from "../ai/qa.ts";
import { getSql } from "../db/client.ts";
import { upsertProduct } from "../db/products.ts";
import type { ProductRow } from "../partners/toss/types.ts";

/**
 * 초안의 단일 읽기·쓰기 창구. CLI 와 관리자 검수 UI 가 같은 함수를 쓴다.
 *
 * 초안 하나 = showroom_versions 한 행. 상품별로 가장 최근 버전을 "그 상품의 초안"으로
 * 본다. 발행하면 그 버전이 showrooms.current_version_id 가 된다.
 */

/** 초안 생명주기. QA 통과 → review, 실패 → failed. 검수 후 published|rejected. */
export type DraftStatus = "review" | "failed" | "published" | "rejected";

export type ShowroomDraft = {
  taca_item_id: number;
  /** 수기 작성 쇼룸은 분석 단계를 거치지 않아 null. */
  analysis: ProductAnalysis | null;
  content: ShowroomContent;
  qa_result: ShowroomQaResult;
  prompt_version: string;
  status: DraftStatus;
};

type DraftRow = {
  version_id: string;
  version: number;
  showroom_id: string;
  showroom_slug: string;
  taca_item_id: string | number;
  analysis: unknown;
  content: unknown;
  qa_result: unknown;
  prompt_version: string;
  review_status: DraftStatus;
};

const DRAFT_COLUMNS = `
  v.id as version_id, v.version, s.id as showroom_id, s.slug as showroom_slug,
  p.taca_item_id, v.analysis, v.content, v.qa_result, v.prompt_version, v.review_status
`;

function parseDraft(row: DraftRow): ShowroomDraft {
  const qa_result = row.qa_result as ShowroomQaResult;
  if (
    !qa_result ||
    typeof qa_result !== "object" ||
    typeof qa_result.passed !== "boolean" ||
    !Array.isArray(qa_result.failures)
  ) {
    throw new Error(`초안 qa_result 형식이 틀립니다: ${row.version_id}`);
  }

  return {
    taca_item_id: Number(row.taca_item_id),
    analysis: row.analysis === null ? null : analysisSchema.parse(row.analysis),
    content: showroomContentSchema.parse(row.content),
    qa_result,
    prompt_version: row.prompt_version,
    status: row.review_status,
  };
}

async function readLatestRow(tacaItemId: number): Promise<DraftRow | null> {
  const sql = getSql();
  const rows = (await sql.query(
    `select ${DRAFT_COLUMNS}
       from showroom_versions v
       join showrooms s on s.id = v.showroom_id
       join products p on p.id = s.product_id
      where p.taca_item_id = $1
      order by v.version desc
      limit 1`,
    [tacaItemId],
  )) as DraftRow[];
  return rows[0] ?? null;
}

/**
 * 상품을 upsert 하고, 쇼룸이 없으면 만든 뒤 새 버전으로 초안을 쌓는다.
 * 쇼룸 slug 는 첫 초안에서 정해지고, 다른 상품이 이미 쓰는 slug 면 거부한다.
 */
export async function writeDraft(
  draft: ShowroomDraft,
  product: ProductRow,
): Promise<{ versionId: string; version: number }> {
  if (product.taca_item_id !== draft.taca_item_id) {
    throw new Error(
      `상품 불일치: 초안 ${draft.taca_item_id}, 상품 ${product.taca_item_id}`,
    );
  }

  const sql = getSql();
  const productId = await upsertProduct(product);
  const slug = draft.content.seo.slug;

  const owner = (await sql`
    select p.taca_item_id from showrooms s join products p on p.id = s.product_id
    where s.slug = ${slug} and s.product_id <> ${productId}
  `) as { taca_item_id: string }[];
  if (owner[0]) {
    throw new Error(
      `slug "${slug}" 는 이미 상품 ${owner[0].taca_item_id} 의 쇼룸이 쓰고 있습니다.`,
    );
  }

  const showroom = (await sql`
    insert into showrooms (product_id, slug) values (${productId}, ${slug})
    on conflict (product_id) do update set product_id = excluded.product_id
    returning id
  `) as { id: string }[];

  const inserted = (await sql`
    insert into showroom_versions (
      showroom_id, version, analysis, content, qa_result, prompt_version, review_status
    )
    select ${showroom[0].id}, coalesce(max(version), 0) + 1,
           ${draft.analysis === null ? null : JSON.stringify(draft.analysis)}::jsonb,
           ${JSON.stringify(draft.content)}::jsonb,
           ${JSON.stringify(draft.qa_result)}::jsonb,
           ${draft.prompt_version}, ${draft.status}
      from showroom_versions where showroom_id = ${showroom[0].id}
    returning id, version
  `) as { id: string; version: number }[];

  return { versionId: inserted[0].id, version: inserted[0].version };
}

export async function readDraft(
  tacaItemId: number,
): Promise<ShowroomDraft | null> {
  const row = await readLatestRow(tacaItemId);
  return row ? parseDraft(row) : null;
}

/** 상품별 최신 버전 목록. */
export async function listDrafts(): Promise<ShowroomDraft[]> {
  const sql = getSql();
  const rows = (await sql.query(
    `select distinct on (p.taca_item_id) ${DRAFT_COLUMNS}
       from showroom_versions v
       join showrooms s on s.id = v.showroom_id
       join products p on p.id = s.product_id
      order by p.taca_item_id, v.version desc`,
  )) as DraftRow[];
  return rows.map(parseDraft);
}

/**
 * QA 의 slug 중복 검사용. 다른 상품의 쇼룸이 차지한 slug 목록.
 * 자기 상품의 slug 는 재생성해도 같은 URL 을 쓰므로 뺀다.
 */
export async function listTakenSlugs(
  excludeTacaItemId: number,
): Promise<string[]> {
  const sql = getSql();
  const rows = (await sql`
    select s.slug from showrooms s join products p on p.id = s.product_id
    where p.taca_item_id <> ${excludeTacaItemId}
  `) as { slug: string }[];
  return rows.map((r) => r.slug);
}

async function setLatestStatus(
  tacaItemId: number,
  status: DraftStatus,
): Promise<ShowroomDraft> {
  const row = await readLatestRow(tacaItemId);
  if (!row) {
    throw new Error(`초안이 없습니다: ${tacaItemId}`);
  }
  const sql = getSql();
  await sql`
    update showroom_versions set review_status = ${status}, reviewed_at = now()
    where id = ${row.version_id}
  `;
  return parseDraft({ ...row, review_status: status });
}

/**
 * QA 통과(review) 초안만 발행한다. 버전 상태와 쇼룸의 현재 버전을
 * 한 트랜잭션으로 바꾼다. 발행된 URL 을 지키기 위해 slug 가 바뀐 초안은 거부한다.
 */
export async function approveDraft(
  tacaItemId: number,
): Promise<{ draft: ShowroomDraft; slug: string }> {
  const row = await readLatestRow(tacaItemId);
  if (!row) {
    throw new Error(`초안이 없습니다: ${tacaItemId}`);
  }
  if (row.review_status !== "review") {
    throw new Error(
      `승인할 수 없습니다. status 가 "${row.review_status}" 입니다 (review 만 가능).`,
    );
  }
  const draft = parseDraft(row);
  if (draft.content.seo.slug !== row.showroom_slug) {
    throw new Error(
      `slug 가 바뀐 초안은 승인할 수 없습니다: 쇼룸 "${row.showroom_slug}", 초안 "${draft.content.seo.slug}"`,
    );
  }

  await publishVersion(row.version_id, row.showroom_id);
  return { draft: { ...draft, status: "published" }, slug: row.showroom_slug };
}

/**
 * 버전을 발행 상태로 바꾸고 쇼룸의 현재 버전으로 지정한다. 한 트랜잭션.
 * 상태 검사는 호출측 책임이다 (approveDraft, 시드 스크립트).
 */
export async function publishVersion(
  versionId: string,
  showroomId: string,
): Promise<void> {
  const sql = getSql();
  await sql.transaction([
    sql`
      update showroom_versions set review_status = 'published', reviewed_at = now()
      where id = ${versionId}
    `,
    sql`
      update showrooms
         set current_version_id = ${versionId},
             status = 'published',
             published_at = coalesce(published_at, now())
       where id = ${showroomId}
    `,
  ]);
}

/** 같은 본문의 버전이 이미 있으면 그 버전. 시드를 여러 번 돌려도 버전이 늘지 않게 한다. */
export async function findVersionByContent(
  tacaItemId: number,
  content: ShowroomContent,
): Promise<{ versionId: string; showroomId: string } | null> {
  const sql = getSql();
  const rows = (await sql`
    select v.id, v.showroom_id
      from showroom_versions v
      join showrooms s on s.id = v.showroom_id
      join products p on p.id = s.product_id
     where p.taca_item_id = ${tacaItemId}
       and v.content = ${JSON.stringify(content)}::jsonb
     order by v.version desc
     limit 1
  `) as { id: string; showroom_id: string }[];
  return rows[0] ? { versionId: rows[0].id, showroomId: rows[0].showroom_id } : null;
}

/** 반려. failed 포함 어떤 초안이든 rejected 로 바꿀 수 있다. */
export async function rejectDraft(tacaItemId: number): Promise<ShowroomDraft> {
  return setLatestStatus(tacaItemId, "rejected");
}
