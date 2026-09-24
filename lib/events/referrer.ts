/**
 * 유입 채널 분류. events.referrer_type 의 값이다.
 *
 * AI 답변 화면은 referrer 를 지우는 경우가 많다. 대신 ChatGPT 처럼 링크에
 * utm_source 를 붙이는 곳이 있어, referrer 보다 utm_source 를 먼저 본다.
 */

export type ReferrerType = "search" | "ai" | "social" | "direct";

/** 호스트 끝부분 일치. "google.com" 은 www.google.com, google.com 과 맞는다. */
const AI_HOSTS = [
  "chatgpt.com",
  "chat.openai.com",
  "perplexity.ai",
  "claude.ai",
  "gemini.google.com",
  "copilot.microsoft.com",
  "you.com",
  "wrtn.ai",
  "clova-x.naver.com",
];

/** 검색 호스트보다 먼저 본다 — 네이버 블로그·카페는 검색이 아니라 커뮤니티 유입이다. */
const SOCIAL_HOSTS = [
  "blog.naver.com",
  "m.blog.naver.com",
  "cafe.naver.com",
  "m.cafe.naver.com",
  "instagram.com",
  "facebook.com",
  "x.com",
  "twitter.com",
  "t.co",
  "threads.net",
  "threads.com",
  "youtube.com",
  "tiktok.com",
  "kakao.com",
  "band.us",
];

const SEARCH_HOSTS = [
  "naver.com",
  "daum.net",
  "bing.com",
  "duckduckgo.com",
  "zum.com",
  "yahoo.com",
];

/** google.com, google.co.kr 등 국가 도메인까지. gemini 는 AI_HOSTS 가 먼저 잡는다. */
const GOOGLE_PATTERN = /(^|\.)google\.[a-z.]+$/;

function matchesHost(host: string, list: string[]): boolean {
  return list.some((h) => host === h || host.endsWith(`.${h}`));
}

function hostOf(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** utm_source 는 "chatgpt.com" 같은 호스트거나 "chatgpt" 같은 이름이다. */
function classifyUtmSource(source: string): ReferrerType | null {
  const s = source.trim().toLowerCase();
  if (!s) return null;
  const asHost = s.includes(".") ? s : null;
  if (asHost && matchesHost(asHost, AI_HOSTS)) return "ai";
  if (/^(chatgpt|openai|perplexity|claude|gemini|copilot|wrtn)$/.test(s)) {
    return "ai";
  }
  return null;
}

export function classifyReferrer(input: {
  referrer?: string | null;
  utmSource?: string | null;
  /** 자기 사이트 호스트. 내부 이동은 direct 로 센다. */
  siteHost?: string;
}): ReferrerType {
  if (input.utmSource) {
    const byUtm = classifyUtmSource(input.utmSource);
    if (byUtm) return byUtm;
  }

  const host = input.referrer ? hostOf(input.referrer) : null;
  if (!host) return "direct";
  if (input.siteHost && host === input.siteHost.toLowerCase()) return "direct";

  if (matchesHost(host, AI_HOSTS)) return "ai";
  if (matchesHost(host, SOCIAL_HOSTS)) return "social";
  if (GOOGLE_PATTERN.test(host) || matchesHost(host, SEARCH_HOSTS)) {
    return "search";
  }
  return "direct";
}
