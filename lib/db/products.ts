import {
  toStoredProduct,
  type ProductRow,
  type StoredProduct,
} from "../partners/toss/types.ts";
import { getSql } from "./client.ts";

/**
 * products 테이블 행 ↔ StoredProduct. 가격은 저장하지 않는다 (toStoredProduct).
 * Neon 드라이버는 bigint·numeric 을 문자열로 돌려주므로 여기서 숫자로 되돌린다.
 */

export type DbProduct = {
  id: string;
  taca_id: string | number;
  taca_item_id: string | number;
  name: string;
  review_score: string | number | null;
  review_count: number;
  category_ids: (string | number)[];
  detail_html_url: string | null;
  is_sold_out: boolean;
  product_url: string;
  tracking_url: string | null;
  image_urls: string[];
};

export function productFromDb(row: DbProduct): StoredProduct {
  return {
    taca_id: Number(row.taca_id),
    taca_item_id: Number(row.taca_item_id),
    name: row.name,
    review_score: row.review_score === null ? 0 : Number(row.review_score),
    review_count: row.review_count,
    category_ids: row.category_ids.map(Number),
    detail_html_url: row.detail_html_url,
    is_sold_out: row.is_sold_out,
    product_url: row.product_url,
    tracking_url: row.tracking_url,
    image_urls: row.image_urls,
  };
}

/**
 * taca_item_id 기준 upsert. API 상품을 받아 가격을 뺀 뒤 저장한다.
 * 품절 등 사실 필드는 매번 덮어쓰고, 발급된 추적 링크는 새 값이 없으면 유지한다.
 * 행 id 를 돌려준다.
 */
export async function upsertProduct(product: ProductRow): Promise<string> {
  const stored = toStoredProduct(product);
  const sql = getSql();
  const rows = (await sql`
    insert into products (
      taca_id, taca_item_id, name, review_score, review_count, category_ids,
      detail_html_url, is_sold_out, product_url, tracking_url, image_urls,
      last_synced_at
    ) values (
      ${stored.taca_id}, ${stored.taca_item_id}, ${stored.name},
      ${stored.review_score}, ${stored.review_count}, ${stored.category_ids},
      ${stored.detail_html_url}, ${stored.is_sold_out}, ${stored.product_url},
      ${stored.tracking_url}, ${stored.image_urls}, now()
    )
    on conflict (taca_item_id) do update set
      taca_id = excluded.taca_id,
      name = excluded.name,
      review_score = excluded.review_score,
      review_count = excluded.review_count,
      category_ids = excluded.category_ids,
      detail_html_url = excluded.detail_html_url,
      is_sold_out = excluded.is_sold_out,
      product_url = excluded.product_url,
      tracking_url = coalesce(excluded.tracking_url, products.tracking_url),
      image_urls = excluded.image_urls,
      last_synced_at = excluded.last_synced_at
    returning id
  `) as { id: string }[];
  return rows[0].id;
}

export async function getProductByTacaItemId(
  tacaItemId: number,
): Promise<StoredProduct | null> {
  const sql = getSql();
  const rows = (await sql`
    select * from products where taca_item_id = ${tacaItemId}
  `) as DbProduct[];
  return rows[0] ? productFromDb(rows[0]) : null;
}
