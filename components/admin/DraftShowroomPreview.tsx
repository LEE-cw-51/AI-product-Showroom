import {
  Benefits,
  Checklist,
  CtaSection,
  Faq,
  Fit,
  Hero,
  Problem,
  Summary,
} from "@/components/showroom";
import { ShowroomStage } from "@/components/showroom/scene/ShowroomStage";
import type { ShowroomContent } from "@/lib/ai/schemas/showroom";
import type { StoredProduct } from "@/lib/partners/toss/types";
import { sceneImages } from "@/lib/showroom/images";

/**
 * 공개 쇼룸과 같은 블록 순서. 검수 미리보기 전용으로 JSON-LD·메타는 뺀다.
 */
export function DraftShowroomPreview({
  content,
  product,
}: {
  content: ShowroomContent;
  product: StoredProduct;
}) {
  const ctaUrl = product.tracking_url ?? product.product_url;

  return (
    <div className="mx-auto w-full max-w-[42rem]">
      <div className="mb-8">
        <ShowroomStage
          visual={content.visual}
          images={sceneImages(product.image_urls, content.visual.hero_image_url, 3)}
          alt={product.name}
        />
      </div>
      <header className="mb-8">
        <h1 className="text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
          {content.seo.h1}
        </h1>
        <p className="mt-3 text-sm text-steel">
          리뷰 {product.review_count.toLocaleString("ko-KR")}건, 평점{" "}
          {product.review_score?.toFixed(1)} ({content.meta.facts_as_of} 기준)
        </p>
      </header>

      <Summary summary={content.summary} factsAsOf={content.meta.facts_as_of} />

      <div className="mt-10 space-y-10">
        <Hero
          headline={content.hero.headline}
          subheadline={content.hero.subheadline}
          ctaUrl={ctaUrl}
          ctaLabel={content.cta.label}
          isSoldOut={product.is_sold_out}
        />

        {content.problem ? <Problem problem={content.problem} /> : null}
        {content.benefits.length > 0 ? (
          <Benefits benefits={content.benefits} />
        ) : null}
        {content.fit ? <Fit fit={content.fit} /> : null}
        {content.checklist.length > 0 ? (
          <Checklist items={content.checklist} />
        ) : null}
        {content.faq.length > 0 ? <Faq items={content.faq} /> : null}

        <CtaSection
          ctaUrl={ctaUrl}
          ctaLabel={content.cta.label}
          isSoldOut={product.is_sold_out}
          productName={product.name}
        />
      </div>
    </div>
  );
}
