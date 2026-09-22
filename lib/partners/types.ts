import type { ProductRow } from "@/lib/partners/toss/types";

/**
 * 파트너(제휴 플랫폼) 어댑터. M1은 픽스처 구현체만 있고,
 * M3에서 고정 IP 워커를 호출하는 토스 구현체로 교체한다.
 * 멀티 파트너는 2차 범위이지만, 경계를 지금 그어두면 교체 비용이 파일 하나로 줄어든다.
 */
export interface AffiliateAdapter {
  readonly name: string;

  /** 상품 옵션 ID 목록으로 상품을 조회한다. 없는 ID는 notFound 로 돌려준다. */
  getProducts(tacaItemIds: number[]): Promise<{
    products: ProductRow[];
    notFoundIds: number[];
  }>;

  /**
   * 추적 링크를 발급한다. subTag 로 유입 채널을 구분한다.
   * 실적 API가 상품 단위로만 제공되므로, 쇼룸 사이트 전용 subTag 를 넣어
   * 다른 채널과 섞이지 않게 한다.
   */
  createTrackingLink(
    tacaItemId: number,
    subTag?: string,
  ): Promise<{ url: string }>;
}
