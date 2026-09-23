import { anthropic } from "@ai-sdk/anthropic";
import { generateText, Output } from "ai";

import {
  analysisSchema,
  type ProductAnalysis,
} from "@/lib/ai/schemas/analysis";
import {
  showroomContentSchema,
  type ShowroomContent,
} from "@/lib/ai/schemas/showroom";
import type { ProductRow } from "@/lib/partners/toss/types";
import { PRICE_NOTE } from "@/lib/site";

/** 쇼룸 생성 프롬프트 버전. 초안·발행 meta·QA 추적용. */
export const PROMPT_VERSION = "showroom-v1" as const;

const model = anthropic("claude-sonnet-5");

/** 프롬프트에 넣는 상품 필드. 가격·리뷰 수치는 절대 포함하지 않는다. */
type PromptProduct = {
  name: string;
  category_ids: number[];
  is_sold_out: boolean;
  detail_url: string;
  image_urls: string[];
};

function toPromptProduct(product: ProductRow): PromptProduct {
  const image_urls = [
    product.raw.thumbnailUrl,
    ...product.raw.mainImageUrls,
    ...product.raw.description.detailImageUrls,
  ];

  return {
    name: product.name,
    category_ids: [...product.category_ids],
    is_sold_out: product.is_sold_out,
    detail_url: product.product_url,
    image_urls: [...new Set(image_urls)],
  };
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const SHARED_RULES = `
규칙:
- 사실은 아래에 제공된 상품 필드에 있는 것만 쓴다. 추측·외부 지식으로 수치를 만들지 않는다.
- 가격 숫자, 할인율, 리뷰 점수·개수는 절대 쓰지 않는다. "원"이 붙은 금액도 금지한다.
- 재고·판매 여부는 is_sold_out 플래그만 참고한다.
`.trim();

async function analyzeProduct(
  promptProduct: PromptProduct,
): Promise<ProductAnalysis> {
  const { output } = await generateText({
    model,
    output: Output.object({
      schema: analysisSchema,
      name: "ProductAnalysis",
      description: "쇼룸 작성용 상품 분석",
    }),
    system: `당신은 생활용품 쇼룸 에디터다. 상품을 분석해 문제·적합/부적합·근거 있는 스펙·카테고리 라벨을 정리한다.
${SHARED_RULES}
- category_label 은 한국어로, 상품이 속할 법한 카테고리 이름이다 (예: "식기건조대", "건강기능식품").
- specs 의 claim 은 evidence 가 상품 필드에서 뒷받침될 때만 넣는다.`,
    prompt: `다음 상품을 분석하라.\n\n${JSON.stringify(promptProduct, null, 2)}`,
  });

  if (!output) {
    throw new Error("상품 분석 결과가 비어 있습니다.");
  }

  return output;
}

async function generateContent(
  promptProduct: PromptProduct,
  analysis: ProductAnalysis,
): Promise<ShowroomContent> {
  const { output } = await generateText({
    model,
    output: Output.object({
      schema: showroomContentSchema,
      name: "ShowroomContent",
      description: "발행용 쇼룸 JSON",
    }),
    system: `당신은 생활용품 쇼룸을 쓰는 에디터다. 분석 결과를 바탕으로 쇼룸 JSON을 채운다.
${SHARED_RULES}
- summary.price_note 는 반드시 다음 문장 그대로다: "${PRICE_NOTE}"
- meta.prompt_version 은 반드시 "${PROMPT_VERSION}" 이다.
- meta.facts_as_of 는 YYYY-MM-DD 형식의 오늘 날짜다.
- seo.slug 는 문제·용도 중심의 영문 소문자 하이픈이다.
- FAQ source 가 product_data 또는 spec 이면 답이 제공된 상품 필드·분석 스펙에 근거해야 한다.
- 한국어로 쓰고 word-break 친화적으로 문장을 끊는다.`,
    prompt: `상품 필드:
${JSON.stringify(promptProduct, null, 2)}

분석 결과:
${JSON.stringify(analysis, null, 2)}

위 입력만으로 쇼룸 JSON을 작성하라.`,
  });

  if (!output) {
    throw new Error("쇼룸 생성 결과가 비어 있습니다.");
  }

  return {
    ...output,
    summary: {
      ...output.summary,
      price_note: PRICE_NOTE,
    },
    meta: {
      ...output.meta,
      prompt_version: PROMPT_VERSION,
      facts_as_of: output.meta.facts_as_of || todayIsoDate(),
    },
  };
}

/**
 * 픽스처/상품 행 → 분석 → 쇼룸 JSON.
 * CLI 파이프라인이 이 함수만 호출한다. 라이브 API 호출은 호출 측 책임이다.
 */
export async function generateShowroom(product: ProductRow): Promise<{
  analysis: ProductAnalysis;
  content: ShowroomContent;
  prompt_version: typeof PROMPT_VERSION;
}> {
  const promptProduct = toPromptProduct(product);
  const analysis = await analyzeProduct(promptProduct);
  const content = await generateContent(promptProduct, analysis);

  return {
    analysis,
    content,
    prompt_version: PROMPT_VERSION,
  };
}

export type { ProductAnalysis };
export { analysisSchema };
