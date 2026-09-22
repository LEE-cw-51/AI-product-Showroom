import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { AffiliateAdapter } from "@/lib/partners/types";
import {
  mapTossItemToProduct,
  tossProductDetailResponseSchema,
  type ProductRow,
} from "@/lib/partners/toss/types";

/**
 * 승인 전 개발용 어댑터. fixtures/products/*.json 을 실제 API 응답으로 취급한다.
 * 파일은 product-detail 응답 envelope 그대로이므로, 같은 Zod 파서를 통과한다.
 */

const FIXTURE_DIR = path.join(process.cwd(), "fixtures", "products");

async function loadAllProducts(): Promise<ProductRow[]> {
  const files = (await readdir(FIXTURE_DIR)).filter((f) => f.endsWith(".json"));
  const rows: ProductRow[] = [];

  for (const file of files) {
    const raw = await readFile(path.join(FIXTURE_DIR, file), "utf8");
    const parsed = tossProductDetailResponseSchema.parse(JSON.parse(raw));
    rows.push(...parsed.success.items.map(mapTossItemToProduct));
  }

  return rows;
}

export const fixtureAdapter: AffiliateAdapter = {
  name: "fixtures",

  async getProducts(tacaItemIds) {
    const all = await loadAllProducts();
    const found = all.filter((p) => tacaItemIds.includes(p.taca_item_id));
    const foundIds = new Set(found.map((p) => p.taca_item_id));

    return {
      products: found,
      notFoundIds: tacaItemIds.filter((id) => !foundIds.has(id)),
    };
  },

  /** 링크 발급 API가 없으므로 원본 상품 URL을 그대로 돌려준다. */
  async createTrackingLink(tacaItemId) {
    const { products, notFoundIds } = await this.getProducts([tacaItemId]);
    if (notFoundIds.length > 0 || !products[0]) {
      throw new Error(`픽스처에 없는 상품입니다: ${tacaItemId}`);
    }
    return { url: products[0].product_url };
  },
};

/** 픽스처 전체를 훑어야 하는 곳(목록·sitemap)에서 쓴다. */
export async function getAllFixtureProducts(): Promise<ProductRow[]> {
  return loadAllProducts();
}

export async function getFixtureProduct(
  tacaItemId: number,
): Promise<ProductRow | null> {
  const all = await loadAllProducts();
  return all.find((p) => p.taca_item_id === tacaItemId) ?? null;
}
