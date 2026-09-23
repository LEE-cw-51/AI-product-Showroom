import { z } from "zod";

/**
 * 상품 분석 결과. 쇼룸 생성 프롬프트의 입력이자, QA가 category_label 을
 * 제한 목록과 문자열 매칭할 때 쓰는 라벨이다.
 * 가격·리뷰 수치는 넣지 않는다 — products 테이블 값만 렌더한다.
 */

const trimmed = (max: number, min = 1) => z.string().trim().min(min).max(max);

export const analysisSpecSchema = z.object({
  /** 치수·재질·구조 등 스펙 주장. */
  claim: trimmed(160),
  /** 주장의 근거. 전달된 상품 필드(이름·이미지 URL 등)에서만. */
  evidence: trimmed(200),
});

export const analysisSchema = z.object({
  /** 이 상품이 푸는 핵심 문제. */
  problem: z.object({
    title: trimmed(70),
    points: z.array(trimmed(160)).min(1).max(5),
  }),
  /** 맞는 사용 상황. */
  fit: z.array(trimmed(120)).min(1).max(5),
  /** 맞지 않는 사용 상황. */
  unfit: z.array(trimmed(120)).min(1).max(5),
  /** 근거가 있는 스펙만. 근거 없으면 비운다. */
  specs: z.array(analysisSpecSchema).max(8).default([]),
  /**
   * 상품명·카테고리 ID로 추정한 한국어 카테고리 라벨.
   * QA가 제한 목록(의료기기, 건강기능식품 등)과 문자열 매칭한다.
   */
  category_label: trimmed(80),
});

export type ProductAnalysis = z.infer<typeof analysisSchema>;
export type AnalysisSpec = z.infer<typeof analysisSpecSchema>;
