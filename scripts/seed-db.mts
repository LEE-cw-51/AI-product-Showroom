/**
 * 파일로 남아 있는 상품·초안·쇼룸을 DB 에 채운다. 여러 번 돌려도 결과가 같다.
 *
 *   npm run db:seed
 *
 * 1. fixtures/products/*        → products (upsert)
 * 2. content/drafts/*.json      → 해당 상품의 새 버전 (같은 본문이 있으면 건너뜀)
 * 3. content/showrooms/*.json   → 같은 본문의 버전을 찾거나 만들어 발행
 *
 * 앱은 content/ 를 읽지 않는다. 이 파일들은 새 DB(브랜치)를 채우는 시드일 뿐이다.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

if (!process.env.DATABASE_URL?.trim()) {
  console.error("DATABASE_URL 이 없습니다. .env.local 에 Neon 연결 문자열을 넣으세요.");
  process.exit(1);
}

const { analysisSchema } = await import("../lib/ai/schemas/analysis.ts");
const { showroomContentSchema } = await import("../lib/ai/schemas/showroom.ts");
const { runShowroomQa } = await import("../lib/ai/qa.ts");
const { upsertProduct } = await import("../lib/db/products.ts");
const { getAllFixtureProducts } = await import("../lib/partners/fixtures.ts");
const drafts = await import("../lib/pipeline/drafts.ts");

type DraftStatus = import("../lib/pipeline/drafts.ts").DraftStatus;
type ShowroomQaResult = import("../lib/ai/qa.ts").ShowroomQaResult;

/** content/ 파일 공통 형태. 초안 파일만 analysis 이하 필드를 가진다. */
type ContentFile = {
  taca_item_id: number;
  content: unknown;
  analysis?: unknown;
  qa_result?: ShowroomQaResult;
  prompt_version?: string;
  status?: DraftStatus;
};

async function readJsonDir(dir: string): Promise<{ file: string; data: ContentFile }[]> {
  const abs = path.join(process.cwd(), dir);
  const files = (await readdir(abs)).filter((f) => f.endsWith(".json")).sort();
  return Promise.all(
    files.map(async (file) => ({
      file,
      data: JSON.parse(await readFile(path.join(abs, file), "utf8")),
    })),
  );
}

// 1. 상품 -----------------------------------------------------------------------
const products = await getAllFixtureProducts();
for (const product of products) {
  await upsertProduct(product);
}
const productById = new Map(products.map((p) => [p.taca_item_id, p]));
console.log(`products   ${products.length}개 upsert`);

function requireProduct(tacaItemId: number, file: string) {
  const product = productById.get(tacaItemId);
  if (!product) throw new Error(`${file}: 픽스처에 없는 상품 ${tacaItemId}`);
  return product;
}

// 2. 초안 -----------------------------------------------------------------------
for (const { file, data } of await readJsonDir("content/drafts")) {
  const content = showroomContentSchema.parse(data.content);
  const product = requireProduct(data.taca_item_id, file);

  if (await drafts.findVersionByContent(product.taca_item_id, content)) {
    console.log(`draft      ${file} 이미 있음`);
    continue;
  }
  const { version } = await drafts.writeDraft(
    {
      taca_item_id: product.taca_item_id,
      analysis: analysisSchema.parse(data.analysis),
      content,
      qa_result: data.qa_result!,
      prompt_version: data.prompt_version!,
      status: data.status!,
    },
    product,
  );
  console.log(`draft      ${file} → v${version} (${data.status})`);
}

// 3. 발행 쇼룸 ------------------------------------------------------------------
for (const { file, data } of await readJsonDir("content/showrooms")) {
  const content = showroomContentSchema.parse(data.content);
  const product = requireProduct(data.taca_item_id, file);

  let ref = await drafts.findVersionByContent(product.taca_item_id, content);
  if (!ref) {
    // 수기 쇼룸: 분석 없이 QA 만 돌려 결과를 남긴다.
    const qa_result = runShowroomQa({
      content,
      product,
      existingSlugs: await drafts.listTakenSlugs(product.taca_item_id),
    });
    if (!qa_result.passed) {
      console.warn(`showroom   ${file} QA 실패 — 기존 공개본이라 그대로 발행한다`);
      for (const f of qa_result.failures) console.warn(`           [${f.code}] ${f.message}`);
    }
    await drafts.writeDraft(
      {
        taca_item_id: product.taca_item_id,
        analysis: null,
        content,
        qa_result,
        prompt_version: content.meta.prompt_version,
        status: "review",
      },
      product,
    );
    ref = await drafts.findVersionByContent(product.taca_item_id, content);
    if (!ref) throw new Error(`${file}: 방금 쓴 버전을 찾지 못했다`);
  }

  await drafts.publishVersion(ref.versionId, ref.showroomId);
  console.log(`showroom   ${file} 발행`);
}
