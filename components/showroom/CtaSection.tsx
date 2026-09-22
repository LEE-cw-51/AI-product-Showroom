import { DISCLOSURE } from "@/lib/site";

import { CtaLink } from "./CtaLink";

/**
 * 마지막 행동 블록. 대가성 문구는 상수를 직접 읽어 항상 함께 렌더한다 —
 * 모든 게시물에 경제적 이해관계를 표시해야 하므로 끌 수 있는 옵션을 두지 않는다.
 */
export function CtaSection({
  ctaUrl,
  ctaLabel,
  isSoldOut,
  productName,
}: {
  ctaUrl: string;
  ctaLabel: string;
  isSoldOut: boolean;
  productName: string;
}) {
  return (
    <section className="border-t border-rule pt-8">
      <p className="mb-4 text-pretty">
        가격과 남은 재고, 배송 조건은 판매 페이지에서 바뀔 수 있습니다. 아래에서
        현재 조건을 확인하세요.
      </p>
      <CtaLink href={ctaUrl} label={ctaLabel} isSoldOut={isSoldOut} />
      <p className="mt-3 text-sm text-steel">{productName}</p>
      <p className="mt-6 border-t border-rule pt-4 text-sm text-steel">
        {DISCLOSURE}
      </p>
    </section>
  );
}
