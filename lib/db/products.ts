import type { ProductRow, TossProductItem } from "../partners/toss/types.ts";
import { getSql } from "./client.ts";

/**
 * products 테이블 행 ↔ ProductRow.
 * Neon 드라이버는 bigint·numeric 을 문자열로 돌려주므로 여기서 숫자로 되돌린다.
 */

export type DbProduct = {
  id: string;
  taca_id: string | number;
  taca_item_id: string | number;
  name: string;
  display_price: number;
  original_price: number;
  discount_rate: number;
  review_score: string | number | null;
  review_count: number;
  category_ids: (string | number)[];
  detail_html_url: string | null;
  is_sold_out: boolean;
  product_url: string;
  tracking_url: string | null;
  raw: unknown;
};

export function productFromDb(row: DbProduct): ProductRow {
  return {
    taca_id: Number(row.taca_id),
    taca_item_id: Number(row.taca_item_id),
    name: row.name,
    display_price: row.display_price,
    original_price: row.original_price,
    discount_rate: row.discount_rate,
    review_score: row.review_score === null ? 0 : Number(row.review_score),
    review_count: row.review_count,
    category_ids: row.category_ids.map(Number),
    detail_html_url: row.detail_html_url,
    is_sold_out: row.is_sold_out,
    product_url: row.product_url,
    tracking_url: row.tracking_url,
    raw: row.raw as TossProductItem,
  };
}

/**
 * taca_item_id 기준 upsert. 가격·품절 등 사실 필드는 매번 덮어쓰고,
 * 발급된 추적 링크는 새 값이 없으면 유지한다. 행 id 를 돌려준다.
 */
export async function upsertProduct(product: ProductRow): Promise<string> {
  const sql = getSql();
  const rows = (await sql`
    insert into products (
      taca_id, taca_item_id, name, display_price, original_price, discount_rate,
      review_score, review_count, category_ids, detail_html_url, is_sold_out,
      product_url, tracking_url, raw, last_synced_at
    ) values (
      ${product.taca_id}, ${product.taca_item_id}, ${product.name},
      ${product.display_price}, ${product.original_price}, ${product.discount_rate},
      ${product.review_score}, ${product.review_count}, ${product.category_ids},
      ${product.detail_html_url}, ${product.is_sold_out}, ${product.product_url},
      ${product.tracking_url}, ${JSON.stringify(product.raw)}::jsonb, now()
    )
    on conflict (taca_item_id) do update set
      taca_id = excluded.taca_id,
      name = excluded.name,
      display_price = excluded.display_price,
      original_price = excluded.original_price,
      discount_rate = excluded.discount_rate,
      review_score = excluded.review_score,
      review_count = excluded.review_count,
      category_ids = excluded.category_ids,
      detail_html_url = excluded.detail_html_url,
      is_sold_out = excluded.is_sold_out,
      product_url = excluded.product_url,
      tracking_url = coalesce(excluded.tracking_url, products.tracking_url),
      raw = excluded.raw,
      last_synced_at = excluded.last_synced_at
    returning id
  `) as { id: string }[];
  return rows[0].id;
}

export async function getProductByTacaItemId(
  tacaItemId: number,
): Promise<ProductRow | null> {
  const sql = getSql();
  const rows = (await sql`
    select * from products where taca_item_id = ${tacaItemId}
  `) as DbProduct[];
  return rows[0] ? productFromDb(rows[0]) : null;
}
