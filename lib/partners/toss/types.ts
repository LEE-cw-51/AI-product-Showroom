import { z } from "zod";

/**
 * 토스 쉐어링크 Open API — 상품 상세 조회 응답.
 * https://sharelink-docs.toss.im/developers/open-api/api/product-detail.md
 *
 * 승인 전이라 실제 호출은 하지 않지만, 픽스처를 이 형태로 만들어 두면
 * M3에서 워커 응답을 그대로 이 파서에 통과시킬 수 있다.
 * 한 번에 최대 30건까지 조회 가능하다.
 */

export const tossProductDescriptionSchema = z.object({
  detailImageUrls: z.array(z.string().url()).default([]),
  noticeImageUrl: z.string().url().nullable().default(null),
  htmlUrl: z.string().url().nullable().default(null),
});

export const tossProductItemSchema = z.object({
  tacaItemId: z.number().int(),
  tacaId: z.number().int(),
  displayName: z.string(),
  thumbnailUrl: z.string().url(),
  mainImageUrls: z.array(z.string().url()).default([]),
  productUrl: z.string().url(),
  displayPrice: z.number(),
  originalPrice: z.number(),
  discountRate: z.number(),
  isSoldOut: z.boolean(),
  reviewScore: z.number(),
  reviewCount: z.number().int(),
  categoryIds: z.array(z.number().int()).default([]),
  description: tossProductDescriptionSchema,
});

export const tossProductDetailResponseSchema = z.object({
  resultType: z.string(),
  success: z.object({
    items: z.array(tossProductItemSchema),
    notFoundIds: z.array(z.number().int()).default([]),
  }),
});

export type TossProductItem = z.infer<typeof tossProductItemSchema>;
export type TossProductDetailResponse = z.infer<
  typeof tossProductDetailResponseSchema
>;

/** products 테이블에 그대로 들어가는 형태. */
export type ProductRow = {
  taca_id: number;
  taca_item_id: number;
  name: string;
  display_price: number;
  original_price: number;
  discount_rate: number;
  review_score: number;
  review_count: number;
  category_ids: number[];
  detail_html_url: string | null;
  is_sold_out: boolean;
  product_url: string;
  /** 발급된 추적 링크. 발급 전(M1)에는 null 이고, CTA 는 product_url 로 폴백한다. */
  tracking_url: string | null;
  /** API 원본. 필드가 추가되어도 마이그레이션 없이 흡수한다. */
  raw: TossProductItem;
};

/**
 * API 응답 항목 → products 행.
 * M3의 실제 호출도 이 함수를 재사용해, 매핑 규칙이 한 곳에만 있게 한다.
 */
export function mapTossItemToProduct(item: TossProductItem): ProductRow {
  return {
    taca_id: item.tacaId,
    taca_item_id: item.tacaItemId,
    name: item.displayName,
    display_price: item.displayPrice,
    original_price: item.originalPrice,
    discount_rate: item.discountRate,
    review_score: item.reviewScore,
    review_count: item.reviewCount,
    category_ids: item.categoryIds,
    detail_html_url: item.description.htmlUrl,
    is_sold_out: item.isSoldOut,
    product_url: item.productUrl,
    tracking_url: null,
    raw: item,
  };
}
