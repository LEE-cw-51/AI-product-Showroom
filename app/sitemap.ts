import type { MetadataRoute } from "next";

import { listShowrooms } from "@/lib/db/showrooms";
import { SITE, absoluteUrl, showroomPath } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const showrooms = await listShowrooms();

  return [
    {
      url: SITE.url,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...showrooms.map((showroom) => ({
      url: absoluteUrl(showroomPath(showroom.slug)),
      lastModified: new Date(showroom.content.meta.facts_as_of),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
