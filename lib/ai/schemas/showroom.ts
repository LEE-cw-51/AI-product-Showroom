import { z } from "zod";

/**
 * 쇼룸 JSON의 단일 진실 공급원.
 * - 렌더링 컴포넌트의 props 타입이 여기서 나온다.
 * - M2의 AI 구조화 생성(generateObject)도 같은 스키마를 쓴다.
 *
 * 글자 수 상한을 스키마에 직접 박아두면 자동 QA 규칙의 절반이 여기서 해결된다.
 * 사실(가격·리뷰 수치)은 이 JSON에 담지 않는다 — products 테이블 값만 렌더한다.
 */

const trimmed = (max: number, min = 1) => z.string().trim().min(min).max(max);

/** 짧은 목록 항목. 한 줄로 읽히는 길이를 넘기지 않는다. */
const bullet = trimmed(90);

export const seoSchema = z.object({
  /** 검색 결과 제목. 60자를 넘기면 잘린다. */
  title: trimmed(60),
  /** meta description. 160자 초과분은 노출되지 않는다. */
  description: trimmed(160),
  /** URL 조각. 상품명이 아니라 문제·용도 중심의 영문 소문자 하이픈. */
  slug: z
    .string()
    .trim()
    .min(3)
    .max(72)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "소문자·숫자·하이픈만 사용한다"),
  /** 페이지의 유일한 h1. title과 달라도 된다. */
  h1: trimmed(80),
  keywords: z.array(trimmed(40)).max(10).default([]),
});

/**
 * GEO 핵심 블록. 페이지 최상단에 고정되어, 이것만 읽어도 답이 되는 자급자족형 요약이다.
 */
export const summarySchema = z.object({
  /** 이 상품이 무엇인지 한 문장. */
  what: trimmed(200),
  best_for: z.array(bullet).min(1).max(5),
  not_for: z.array(bullet).min(1).max(5),
  pros: z.array(bullet).min(2).max(5),
  cons: z.array(bullet).min(1).max(5),
  /** 가격은 숫자로 쓰지 않고 확인 경로와 기준일만 안내한다. */
  price_note: trimmed(120),
});

export const heroSchema = z.object({
  headline: trimmed(70),
  subheadline: trimmed(160),
});

export const problemSchema = z.object({
  title: trimmed(70),
  points: z.array(trimmed(160)).min(2).max(5),
});

/** 기능 → 해결 → 이점. 셋이 모두 있어야 의미가 있으므로 부분 누락을 허용하지 않는다. */
export const benefitSchema = z.object({
  feature: trimmed(60),
  solves: trimmed(160),
  gain: trimmed(160),
});

export const fitSchema = z.object({
  recommended: z.array(bullet).min(1).max(5),
  not_recommended: z.array(bullet).min(1).max(5),
});

export const faqItemSchema = z.object({
  /** 질문형으로 쓴다. 소제목이 그대로 h3가 된다. */
  q: trimmed(100),
  /** 첫 문장이 직답이어야 한다. */
  a: trimmed(400),
  /**
   * 근거의 출처. product_data = API가 준 사실에서 나온 답,
   * general = 카테고리 일반 상식, spec = 상세페이지 스펙 표기.
   */
  source: z.enum(["product_data", "spec", "general"]),
});

export const ctaSchema = z.object({
  label: trimmed(40),
});

export const metaSchema = z.object({
  /** 사실 필드의 기준일 (YYYY-MM-DD). 수치를 보여줄 때 항상 함께 표기한다. */
  facts_as_of: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식"),
  /** 어떤 프롬프트 버전이 만든 결과인지. 수기 작성은 manual-v1. */
  prompt_version: trimmed(40),
});

export const showroomContentSchema = z.object({
  seo: seoSchema,
  summary: summarySchema,
  hero: heroSchema,
  /** 근거가 없으면 비운다. 값이 없는 섹션은 렌더하지 않는다. */
  problem: problemSchema.optional(),
  benefits: z.array(benefitSchema).max(6).default([]),
  fit: fitSchema.optional(),
  checklist: z.array(trimmed(160)).max(6).default([]),
  faq: z.array(faqItemSchema).max(8).default([]),
  cta: ctaSchema,
  meta: metaSchema,
});

export type ShowroomContent = z.infer<typeof showroomContentSchema>;
export type ShowroomSummary = z.infer<typeof summarySchema>;
export type ShowroomBenefit = z.infer<typeof benefitSchema>;
export type ShowroomFaqItem = z.infer<typeof faqItemSchema>;
export type ShowroomProblem = z.infer<typeof problemSchema>;
export type ShowroomFit = z.infer<typeof fitSchema>;
