/**
 * 픽스처 상품 한 건을 analyze → generate → QA 한 뒤 content/drafts 에 쓴다.
 *
 *   npm run pipeline -- <tacaItemId>
 *
 * ANTHROPIC_API_KEY 가 없으면 생성 모듈을 불러오기 전에 종료한다.
 * 경로 별칭은 resolve-alias 로더가 처리한다.
 */

function usage(): never {
  console.error("사용법: npm run pipeline -- <tacaItemId>");
  process.exit(1);
}

const arg = process.argv[2];
if (!arg) usage();

const tacaItemId = Number(arg);
if (!Number.isInteger(tacaItemId) || tacaItemId <= 0) {
  console.error(`잘못된 tacaItemId: ${arg}`);
  process.exit(1);
}

if (!process.env.ANTHROPIC_API_KEY?.trim()) {
  console.error(
    "ANTHROPIC_API_KEY 가 없습니다. 생성 전에 종료합니다. .env 또는 환경 변수에 키를 넣으세요.",
  );
  process.exit(1);
}

const { generateShowroom } = await import("../lib/ai/generate.ts");
const { runShowroomQa } = await import("../lib/ai/qa.ts");
const { writeDraft } = await import("../lib/pipeline/drafts.ts");
const { getFixtureProduct } = await import("../lib/partners/fixtures.ts");

const product = await getFixtureProduct(tacaItemId);
if (!product) {
  console.error(`픽스처에 없는 상품입니다: ${tacaItemId}`);
  process.exit(1);
}

console.log(`생성 시작: ${product.name} (${tacaItemId})`);

const { analysis, content, prompt_version } = await generateShowroom(product);

const qa_result = runShowroomQa({
  content,
  product,
  categoryLabel: analysis.category_label,
});

const draft = {
  taca_item_id: tacaItemId,
  analysis,
  content,
  qa_result,
  prompt_version,
  status: qa_result.status,
};

const file = await writeDraft(draft);

console.log(`초안 저장: ${file}`);
console.log(`status: ${draft.status}`);
if (!qa_result.passed) {
  console.log("QA 실패:");
  for (const f of qa_result.failures) {
    console.log(`  [${f.code}] ${f.message}`);
  }
  process.exitCode = 1;
} else {
  console.log("QA 통과 → 검수 대기(review)");
}
