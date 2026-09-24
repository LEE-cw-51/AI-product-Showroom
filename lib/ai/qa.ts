import { showroomContentSchema } from "./schemas/showroom.ts";
import { productImageUrls, type ProductRow } from "../partners/toss/types.ts";

/**
 * 결정적 쇼룸 QA. 모델 호출 없이 실패 코드만 모은다.
 * 통과 → 초안 status `review`, 실패 → `failed`.
 */

/** 상품명·카테고리 라벨 부분 일치. 공식 카테고리 ID 표는 아직 없다. */
export const RESTRICTED_CATEGORY_LABELS = [
  "의료기기",
  "건강기능식품",
  "조제유",
  "주류",
  "성인",
] as const;

/** 본문 금액 누출. 숫자 + 원 (예: 28900원, 28,900 원). */
const WON_AMOUNT_PATTERN = /\d[\d,]*\s*원/;

export type ShowroomQaFailureCode =
  | "schema_parse"
  | "forbidden_numeric"
  | "won_amount"
  | "restricted_category"
  | "slug_collision"
  | "visual_image";

export type ShowroomQaFailure = {
  code: ShowroomQaFailureCode;
  message: string;
};

/** 초안에 넣을 상태 문자열. pass → review, fail → failed. */
export type ShowroomQaDraftStatus = "review" | "failed";

export type ShowroomQaResult = {
  passed: boolean;
  /** pass → `review`, fail → `failed` */
  status: ShowroomQaDraftStatus;
  failures: ShowroomQaFailure[];
};

export type RunShowroomQaInput = {
  content: unknown;
  product: ProductRow;
  /** 분석 단계의 추정 카테고리 라벨. 공식 ID 대신 이름 매칭에 쓴다. */
  categoryLabel?: string;
  /**
   * 다른 상품의 쇼룸이 이미 쓰는 slug 목록 (`listTakenSlugs`).
   * 자기 상품의 slug 는 재생성해도 같은 URL 이므로 호출측에서 뺀다.
   */
  existingSlugs: string[];
};

function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
    return out;
  }
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) collectStrings(child, out);
  }
  return out;
}

function checkForbiddenNumerics(
  strings: string[],
  product: ProductRow,
): ShowroomQaFailure[] {
  const failures: ShowroomQaFailure[] = [];
  const markers: { label: string; value: number }[] = [
    { label: "display_price", value: product.display_price },
    { label: "original_price", value: product.original_price },
    { label: "review_count", value: product.review_count },
  ];

  for (const { label, value } of markers) {
    const needle = String(value);
    if (!needle) continue;
    for (const text of strings) {
      if (text.includes(needle)) {
        failures.push({
          code: "forbidden_numeric",
          message: `본문에 상품 ${label} 값(${needle})이 포함되어 있다`,
        });
        break;
      }
    }
  }
  return failures;
}

function checkWonAmounts(strings: string[]): ShowroomQaFailure[] {
  for (const text of strings) {
    if (WON_AMOUNT_PATTERN.test(text)) {
      return [
        {
          code: "won_amount",
          message: `본문에 원화 금액 패턴이 있다: "${text.slice(0, 80)}"`,
        },
      ];
    }
  }
  return [];
}

function checkRestrictedCategory(
  product: ProductRow,
  categoryLabel?: string,
): ShowroomQaFailure[] {
  const haystacks = [product.name, categoryLabel ?? ""].filter(Boolean);
  for (const label of RESTRICTED_CATEGORY_LABELS) {
    for (const hay of haystacks) {
      if (hay.includes(label)) {
        return [
          {
            code: "restricted_category",
            message: `제한 카테고리 "${label}"이(가) 상품명 또는 카테고리 라벨에 있다`,
          },
        ];
      }
    }
  }
  return [];
}

function checkSlugCollision(
  content: unknown,
  existingSlugs: string[],
): ShowroomQaFailure[] {
  const slug =
    content &&
    typeof content === "object" &&
    "seo" in content &&
    content.seo &&
    typeof content.seo === "object" &&
    "slug" in content.seo &&
    typeof content.seo.slug === "string"
      ? content.seo.slug
      : null;

  if (!slug) return [];

  if (existingSlugs.includes(slug)) {
    return [
      {
        code: "slug_collision",
        message: `seo.slug "${slug}"이(가) 이미 발행된 쇼룸과 겹친다`,
      },
    ];
  }
  return [];
}

/** visual.hero_image_url 이 실제 상품 이미지 중 하나인지. 모델이 URL 을 지어내면 잡는다. */
function checkVisualImage(
  content: unknown,
  product: ProductRow,
): ShowroomQaFailure[] {
  const parsed = showroomContentSchema.safeParse(content);
  if (!parsed.success) return [];
  const heroUrl = parsed.data.visual.hero_image_url;
  if (heroUrl && !productImageUrls(product.raw).includes(heroUrl)) {
    return [
      {
        code: "visual_image",
        message: `visual.hero_image_url 이(가) 상품 이미지 목록에 없다: ${heroUrl}`,
      },
    ];
  }
  return [];
}

export function runShowroomQa(input: RunShowroomQaInput): ShowroomQaResult {
  const { content, product, categoryLabel, existingSlugs } = input;

  const failures: ShowroomQaFailure[] = [];

  const parsed = showroomContentSchema.safeParse(content);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    failures.push({
      code: "schema_parse",
      message: `showroomContentSchema 파싱 실패${detail ? ` (${detail})` : ""}`,
    });
  }

  const strings = collectStrings(content);
  failures.push(...checkForbiddenNumerics(strings, product));
  failures.push(...checkWonAmounts(strings));
  failures.push(...checkRestrictedCategory(product, categoryLabel));
  failures.push(...checkSlugCollision(content, existingSlugs));
  failures.push(...checkVisualImage(content, product));

  const passed = failures.length === 0;
  return {
    passed,
    status: passed ? "review" : "failed",
    failures,
  };
}
