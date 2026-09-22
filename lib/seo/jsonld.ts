import type {
  Article,
  BreadcrumbList,
  FAQPage,
  WithContext,
} from "schema-dts";

import type { ShowroomContent } from "@/lib/ai/schemas/showroom";
import { SITE, absoluteUrl, showroomPath } from "@/lib/site";

/**
 * Article + FAQPage + BreadcrumbList 만 쓴다.
 *
 * Product / Offer 는 의도적으로 넣지 않는다. 가격을 구조화 데이터로 나열하면
 * 토스 쉐어링크 운영 정책이 금지하는 "커머스형(가격 DB 나열·전시)" 사이트로
 * 판정될 위험이 있다. schema-dts 의 타입이 이 규칙을 컴파일 단계에서 지켜준다 —
 * 아래 반환 타입에 Product 가 없으므로 실수로 끼워넣으면 타입 에러가 난다.
 */

export function articleJsonLd(
  content: ShowroomContent,
): WithContext<Article> {
  const url = absoluteUrl(showroomPath(content.seo.slug));

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: content.seo.h1,
    description: content.seo.description,
    inLanguage: "ko",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    // 사실 필드의 기준일을 그대로 발행일로 쓴다.
    datePublished: content.meta.facts_as_of,
    dateModified: content.meta.facts_as_of,
    author: { "@type": "Organization", name: SITE.name, url: SITE.url },
    publisher: { "@type": "Organization", name: SITE.name, url: SITE.url },
  };
}

export function faqJsonLd(
  content: ShowroomContent,
): WithContext<FAQPage> | null {
  if (content.faq.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: content.faq.map((item) => ({
      "@type": "Question" as const,
      name: item.q,
      acceptedAnswer: { "@type": "Answer" as const, text: item.a },
    })),
  };
}

export function breadcrumbJsonLd(
  content: ShowroomContent,
): WithContext<BreadcrumbList> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: SITE.name,
        item: SITE.url,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: content.seo.h1,
        item: absoluteUrl(showroomPath(content.seo.slug)),
      },
    ],
  };
}

/**
 * JSON.stringify 는 XSS 용 문자열을 정화하지 않으므로 `<` 를 유니코드로 바꾼다.
 * (Next.js JSON-LD 가이드의 권장 처리)
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\u003c");
}
