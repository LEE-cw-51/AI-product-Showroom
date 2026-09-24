import {
  showroomContentSchema,
  type ShowroomContent,
} from "@/lib/ai/schemas/showroom";
import { getSql } from "@/lib/db/client";
import { productFromDb, type DbProduct } from "@/lib/db/products";
import type { StoredProduct } from "@/lib/partners/toss/types";

/**
 * 공개 쇼룸 데이터 접근의 단일 창구. 발행된(published) 쇼룸의 현재 버전만 읽는다.
 * 페이지·sitemap 은 이 파일의 함수만 쓴다.
 */

export type Showroom = {
  id: string;
  /** 지금 공개 중인 버전. 이벤트를 버전별로 나눠 수정 전후를 비교한다. */
  versionId: string;
  slug: string;
  content: ShowroomContent;
  product: StoredProduct;
  /** CTA 목적지. 추적 링크가 없으면 원본 상품 URL. */
  ctaUrl: string;
  /** 품절이면 CTA 를 비활성화한다. */
  isSoldOut: boolean;
};

type ShowroomRow = {
  showroom_id: string;
  version_id: string;
  slug: string;
  content: unknown;
  product: DbProduct;
};

const SELECT_PUBLISHED = `
  select s.id as showroom_id, v.id as version_id, s.slug, v.content,
         to_jsonb(p) as product
    from showrooms s
    join showroom_versions v on v.id = s.current_version_id
    join products p on p.id = s.product_id
   where s.status = 'published'
`;

function toShowroom(row: ShowroomRow): Showroom {
  const content = showroomContentSchema.parse(row.content);
  if (content.seo.slug !== row.slug) {
    throw new Error(
      `slug 불일치: 쇼룸은 ${row.slug}, 현재 버전 seo.slug 는 ${content.seo.slug}`,
    );
  }
  const product = productFromDb(row.product);
  return {
    id: row.showroom_id,
    versionId: row.version_id,
    slug: row.slug,
    content,
    product,
    ctaUrl: product.tracking_url ?? product.product_url,
    isSoldOut: product.is_sold_out,
  };
}

export async function listShowroomSlugs(): Promise<string[]> {
  const sql = getSql();
  const rows = (await sql`
    select slug from showrooms where status = 'published' order by slug
  `) as { slug: string }[];
  return rows.map((r) => r.slug);
}

export async function getShowroom(slug: string): Promise<Showroom | null> {
  const sql = getSql();
  const rows = (await sql.query(`${SELECT_PUBLISHED} and s.slug = $1`, [
    slug,
  ])) as ShowroomRow[];
  return rows[0] ? toShowroom(rows[0]) : null;
}

export async function listShowrooms(): Promise<Showroom[]> {
  const sql = getSql();
  const rows = (await sql.query(
    `${SELECT_PUBLISHED} order by s.slug`,
  )) as ShowroomRow[];
  return rows.map(toShowroom);
}

/** 이벤트 수집용 가벼운 조회. 본문을 파싱하지 않는다. */
export async function findPublishedShowroomRef(
  slug: string,
): Promise<{ id: string; versionId: string | null } | null> {
  const sql = getSql();
  const rows = (await sql`
    select id, current_version_id from showrooms
    where slug = ${slug} and status = 'published'
  `) as { id: string; current_version_id: string | null }[];
  return rows[0]
    ? { id: rows[0].id, versionId: rows[0].current_version_id }
    : null;
}
