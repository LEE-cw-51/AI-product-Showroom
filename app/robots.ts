import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site";

/**
 * AI 크롤러를 명시적으로 허용한다. GEO 의 전제는 색인·수집 가능성이고,
 * 이 목록이 막히면 나머지 최적화는 의미가 없다.
 */
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: "/admin" },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: "/admin" },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
