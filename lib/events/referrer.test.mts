import assert from "node:assert/strict";
import { test } from "node:test";

import { classifyReferrer } from "./referrer.ts";

test("검색 엔진", () => {
  for (const referrer of [
    "https://www.google.com/",
    "https://www.google.co.kr/search?q=x",
    "https://search.naver.com/search.naver?query=x",
    "https://m.search.naver.com/",
    "https://search.daum.net/search?q=x",
    "https://www.bing.com/search?q=x",
  ]) {
    assert.equal(classifyReferrer({ referrer }), "search", referrer);
  }
});

test("AI 답변 화면", () => {
  for (const referrer of [
    "https://chatgpt.com/",
    "https://www.perplexity.ai/search/x",
    "https://claude.ai/chat/x",
    "https://gemini.google.com/app",
    "https://copilot.microsoft.com/",
  ]) {
    assert.equal(classifyReferrer({ referrer }), "ai", referrer);
  }
});

test("gemini 는 google 검색이 아니라 AI 다", () => {
  assert.equal(classifyReferrer({ referrer: "https://gemini.google.com/" }), "ai");
});

test("네이버 블로그·카페는 검색이 아니라 소셜이다", () => {
  assert.equal(classifyReferrer({ referrer: "https://blog.naver.com/abc/1" }), "social");
  assert.equal(classifyReferrer({ referrer: "https://m.cafe.naver.com/x" }), "social");
  assert.equal(classifyReferrer({ referrer: "https://search.naver.com/" }), "search");
});

test("소셜", () => {
  for (const referrer of [
    "https://l.instagram.com/",
    "https://t.co/abc",
    "https://www.threads.net/@x",
    "https://m.youtube.com/watch?v=x",
  ]) {
    assert.equal(classifyReferrer({ referrer }), "social", referrer);
  }
});

test("utm_source 가 AI 면 referrer 가 없어도 AI", () => {
  assert.equal(classifyReferrer({ referrer: "", utmSource: "chatgpt.com" }), "ai");
  assert.equal(classifyReferrer({ utmSource: "perplexity" }), "ai");
});

test("AI 가 아닌 utm_source 는 referrer 로 판단한다", () => {
  assert.equal(
    classifyReferrer({ referrer: "https://www.google.com/", utmSource: "newsletter" }),
    "search",
  );
});

test("빈 값·잘못된 URL·자기 사이트·모르는 호스트는 direct", () => {
  assert.equal(classifyReferrer({}), "direct");
  assert.equal(classifyReferrer({ referrer: "not a url" }), "direct");
  assert.equal(
    classifyReferrer({ referrer: "https://example.com/showroom/a", siteHost: "example.com" }),
    "direct",
  );
  assert.equal(classifyReferrer({ referrer: "https://some-blog.example/" }), "direct");
});

test("비슷한 이름의 다른 도메인에 속지 않는다", () => {
  assert.equal(classifyReferrer({ referrer: "https://notgoogle.com/" }), "direct");
  assert.equal(classifyReferrer({ referrer: "https://fakeclaude.ai/" }), "direct");
});
