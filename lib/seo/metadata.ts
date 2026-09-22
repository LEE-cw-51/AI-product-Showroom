import type { Metadata } from "next";

import type { ShowroomContent } from "@/lib/ai/schemas/showroom";
import { SITE, absoluteUrl, showroomPath } from "@/lib/site";

export function showroomMetadata(content: ShowroomContent): Metadata {
  const url = absoluteUrl(showroomPath(content.seo.slug));

  return {
    title: content.seo.title,
    description: content.seo.description,
    keywords: content.seo.keywords.length > 0 ? content.seo.keywords : undefined,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      siteName: SITE.name,
      locale: SITE.locale,
      title: content.seo.title,
      description: content.seo.description,
    },
    twitter: {
      card: "summary",
      title: content.seo.title,
      description: content.seo.description,
    },
  };
}
