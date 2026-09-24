import { notFound } from "next/navigation";

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
import { ShowroomTracker } from "@/components/showroom/ShowroomTracker";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  serializeJsonLd,
} from "@/lib/seo/jsonld";
import { showroomMetadata } from "@/lib/seo/metadata";
import { getShowroom, listShowroomSlugs } from "@/lib/db/showrooms";
import { sceneImages } from "@/lib/showroom/images";

/** 발행 후 하루 한 번 재생성. 품절 갱신은 품절 확인 작업이 별도로 트리거한다. */
export const revalidate = 86400;
/**
 * 빌드 뒤에 승인된 쇼룸도 첫 요청에서 생성되도록 true 로 둔다.
 * 발행되지 않은 slug 는 getShowroom 이 null 을 돌려 404 가 된다.
 */
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await listShowroomSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/showroom/[slug]">) {
  const { slug } = await params;
  const showroom = await getShowroom(slug);
  if (!showroom) return {};
  return showroomMetadata(showroom.content);
}

export default async function ShowroomPage({
  params,
}: PageProps<"/showroom/[slug]">) {
  const { slug } = await params;
  const showroom = await getShowroom(slug);
  if (!showroom) notFound();

  const { content, product, ctaUrl, isSoldOut } = showroom;
  const faqLd = faqJsonLd(content);

  return (
    <main className="w-full pb-16">
      <ShowroomTracker slug={showroom.slug} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(articleJsonLd(content)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(breadcrumbJsonLd(content)),
        }}
      />
      {faqLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqLd) }}
        />
      ) : null}

      <ShowroomStage
        visual={content.visual}
        images={sceneImages(product.image_urls, content.visual.hero_image_url, 3)}
        alt={product.name}
      />

      <div className="mx-auto w-full max-w-[42rem] px-4 pt-10">
        <header className="mb-8">
          <h1 className="text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
            {content.seo.h1}
          </h1>
          <p className="mt-3 text-sm text-steel">
            리뷰 {product.review_count.toLocaleString("ko-KR")}건, 평점{" "}
            {product.review_score?.toFixed(1)} ({content.meta.facts_as_of} 기준)
          </p>
        </header>

        {/* 자급자족형 요약은 항상 첫 블록이다 */}
        <Summary summary={content.summary} factsAsOf={content.meta.facts_as_of} />

        <div className="mt-10 space-y-10">
          <Hero
            headline={content.hero.headline}
            subheadline={content.hero.subheadline}
            ctaUrl={ctaUrl}
            ctaLabel={content.cta.label}
            isSoldOut={isSoldOut}
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
            isSoldOut={isSoldOut}
            productName={product.name}
          />
        </div>
      </div>
    </main>
  );
}
