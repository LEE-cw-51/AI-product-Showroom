/**
 * 브랜드·사이트 단위 상수. 도메인과 브랜드명이 확정되면 이 파일 한 곳만 고친다.
 * 토스 운영 정책상 파트너 사이트는 토스 명칭을 브랜드로 쓸 수 없으므로
 * SITE_NAME 에 "토스"가 들어가지 않게 유지한다.
 */
export const SITE = {
  /** 미정. 배포 시 NEXT_PUBLIC_SITE_URL 로 주입한다. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  /** 미정 — 플레이스홀더. */
  name: "고른자리",
  tagline: "쓸 자리부터 따져보는 생활용품 기록",
  locale: "ko_KR",
} as const;

/**
 * 대가성 문구. 모든 쇼룸 하단 CTA에 무조건 렌더된다(끌 수 없다).
 * 토스 쉐어링크 운영 정책: 모든 게시물에 경제적 이해관계를 표시해야 한다.
 */
export const DISCLOSURE =
  "이 페이지의 링크로 상품을 구매하면 운영자가 일정액의 수수료를 받습니다.";

/** CTA 라벨 기본값. 상품 판매·결제는 토스쇼핑에서 이루어진다는 사실을 밝힌다. */
export const CTA_LABEL = "토스쇼핑에서 상품 확인하기";

/** 사실 필드 기준일 표기에 쓰는 안내. 가격은 본문에 숫자로 쓰지 않는다. */
export const PRICE_NOTE = "가격과 재고는 토스쇼핑에서 확인하세요.";

export function absoluteUrl(path: string): string {
  return new URL(path, SITE.url).toString();
}

export function showroomPath(slug: string): string {
  return `/showroom/${slug}`;
}
