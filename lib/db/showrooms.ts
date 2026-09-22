import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import {
  showroomContentSchema,
  type ShowroomContent,
} from "@/lib/ai/schemas/showroom";
import { getFixtureProduct } from "@/lib/partners/fixtures";
import type { ProductRow } from "@/lib/partners/toss/types";

/**
 * 쇼룸 데이터 접근의 단일 창구.
 *
 * M1 은 content/showrooms/*.json (수기 작성) + fixtures/products (목업 상품)를 읽는다.
 * M2 에서 showroom_versions 테이블로 옮길 때 이 파일의 구현만 바꾸면 되고,
 * 페이지·sitemap 은 손대지 않는다.
 */

const CONTENT_DIR = path.join(process.cwd(), "content", "showrooms");

export type Showroom = {
  slug: string;
  content: ShowroomContent;
  product: ProductRow;
  /** CTA 목적지. 추적 링크가 없으면 원본 상품 URL. */
  ctaUrl: string;
  /** 품절이면 CTA 를 비활성화한다. */
  isSoldOut: boolean;
};

type ShowroomFile = {
  /** 이 쇼룸이 다루는 상품 옵션 ID. */
  taca_item_id: number;
  content: unknown;
};

async function readShowroomFile(slug: string): Promise<ShowroomFile | null> {
  try {
    const raw = await readFile(path.join(CONTENT_DIR, `${slug}.json`), "utf8");
    return JSON.parse(raw) as ShowroomFile;
  } catch {
    return null;
  }
}

export async function listShowroomSlugs(): Promise<string[]> {
  const files = await readdir(CONTENT_DIR);
  return files
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
}

export async function getShowroom(slug: string): Promise<Showroom | null> {
  const file = await readShowroomFile(slug);
  if (!file) return null;

  const content = showroomContentSchema.parse(file.content);
  if (content.seo.slug !== slug) {
    throw new Error(
      `slug 불일치: 파일은 ${slug}.json, seo.slug 는 ${content.seo.slug}`,
    );
  }

  const product = await getFixtureProduct(file.taca_item_id);
  if (!product) {
    throw new Error(`상품을 찾을 수 없습니다: ${file.taca_item_id}`);
  }

  return {
    slug,
    content,
    product,
    ctaUrl: product.tracking_url ?? product.product_url,
    isSoldOut: product.is_sold_out,
  };
}

export async function listShowrooms(): Promise<Showroom[]> {
  const slugs = await listShowroomSlugs();
  const showrooms = await Promise.all(slugs.map((slug) => getShowroom(slug)));
  return showrooms.filter((s): s is Showroom => s !== null);
}
