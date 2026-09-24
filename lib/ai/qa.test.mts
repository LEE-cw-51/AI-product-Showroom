/**
 * 결정적 쇼룸 QA 단위 테스트.
 *
 *   npm run test:qa
 *
 * Node 타입 스트리핑으로 실행한다. `@/` 별칭은 쓰지 않는다.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { runShowroomQa } from "./qa.ts";
import {
  mapTossItemToProduct,
  tossProductDetailResponseSchema,
  type ProductRow,
} from "../partners/toss/types.ts";

const ROOT = process.cwd();

async function loadGolden(): Promise<{ content: unknown; product: ProductRow }> {
  const showroomRaw = JSON.parse(
    await readFile(
      path.join(ROOT, "content", "showrooms", "narrow-sink-dish-rack.json"),
      "utf8",
    ),
  ) as { taca_item_id: number; content: unknown };

  const fixtureRaw = JSON.parse(
    await readFile(path.join(ROOT, "fixtures", "products", "1001.json"), "utf8"),
  );
  const fixture = tossProductDetailResponseSchema.parse(fixtureRaw);
  const item = fixture.success.items.find(
    (row) => row.tacaItemId === showroomRaw.taca_item_id,
  );
  assert.ok(item, `픽스처에 tacaItemId ${showroomRaw.taca_item_id} 가 없다`);

  return {
    content: showroomRaw.content,
    product: mapTossItemToProduct(item),
  };
}

function cloneContent(content: unknown): Record<string, unknown> {
  return structuredClone(content) as Record<string, unknown>;
}

describe("runShowroomQa", () => {
  it("수기 쇼룸 narrow-sink-dish-rack 은 통과한다", async () => {
    const { content, product } = await loadGolden();
    const result = runShowroomQa({
      content,
      product,
      // 자기 slug 재검증이므로 발행 목록에서 제외
      existingSlugs: [],
    });

    assert.equal(result.passed, true);
    assert.equal(result.status, "review");
    assert.deepEqual(result.failures, []);
  });

  it("본문에 원화 금액 문장이 있으면 실패한다", async () => {
    const { content, product } = await loadGolden();
    const mutated = cloneContent(content);
    const summary = mutated.summary as { what: string };
    summary.what = `${summary.what} 지금 28,900원입니다.`;

    const result = runShowroomQa({
      content: mutated,
      product,
      existingSlugs: [],
    });

    assert.equal(result.passed, false);
    assert.equal(result.status, "failed");
    assert.ok(
      result.failures.some((f) => f.code === "won_amount"),
      `expected won_amount, got ${JSON.stringify(result.failures)}`,
    );
  });

  it("상품명에 제한 카테고리가 있으면 실패한다", async () => {
    const { content, product } = await loadGolden();
    const restricted: ProductRow = {
      ...product,
      name: `${product.name} 의료기기 인증`,
    };

    const result = runShowroomQa({
      content,
      product: restricted,
      existingSlugs: [],
    });

    assert.equal(result.passed, false);
    assert.equal(result.status, "failed");
    assert.ok(
      result.failures.some((f) => f.code === "restricted_category"),
      `expected restricted_category, got ${JSON.stringify(result.failures)}`,
    );
  });

  it("카테고리 라벨이 제한 목록이면 실패한다", async () => {
    const { content, product } = await loadGolden();

    const result = runShowroomQa({
      content,
      product,
      categoryLabel: "건강기능식품",
      existingSlugs: [],
    });

    assert.equal(result.passed, false);
    assert.ok(result.failures.some((f) => f.code === "restricted_category"));
  });

  it("display_price 숫자가 본문에 있으면 실패한다", async () => {
    const { content, product } = await loadGolden();
    const mutated = cloneContent(content);
    const hero = mutated.hero as { headline: string };
    hero.headline = `가격 ${product.display_price} 확인`;

    const result = runShowroomQa({
      content: mutated,
      product,
      existingSlugs: [],
    });

    assert.equal(result.passed, false);
    assert.ok(result.failures.some((f) => f.code === "forbidden_numeric"));
  });

  it("seo.slug 가 발행 목록과 겹치면 실패한다", async () => {
    const { content, product } = await loadGolden();

    const result = runShowroomQa({
      content,
      product,
      existingSlugs: ["narrow-sink-dish-rack"],
    });

    assert.equal(result.passed, false);
    assert.ok(result.failures.some((f) => f.code === "slug_collision"));
  });

  it("visual.hero_image_url 이 상품 이미지가 아니면 실패한다", async () => {
    const { content, product } = await loadGolden();
    const broken = cloneContent(content);
    broken.visual = {
      preset: "float",
      palette: "tile",
      hero_image_url: "https://static.example-cdn.test/fixtures/9999/made-up.jpg",
    };

    const result = runShowroomQa({
      content: broken,
      product,
      existingSlugs: [],
    });

    assert.equal(result.passed, false);
    assert.ok(result.failures.some((f) => f.code === "visual_image"));
  });

  it("스키마를 깨면 schema_parse 로 실패한다", async () => {
    const { product } = await loadGolden();

    const result = runShowroomQa({
      content: { seo: { slug: "x" } },
      product,
      existingSlugs: [],
    });

    assert.equal(result.passed, false);
    assert.ok(result.failures.some((f) => f.code === "schema_parse"));
  });
});
