import { CTA_LABEL } from "@/lib/site";

/**
 * 본문 흐름 안에만 놓이는 CTA. position: fixed / sticky 를 쓰지 않는다 —
 * 본문을 가리는 플로팅 배너와 진입 시 앱 자동 실행은 토스 운영 정책이 금지한다.
 * 품절이면 링크가 아니라 상태 표시로 바뀐다.
 */
export function CtaLink({
  href,
  label,
  isSoldOut,
}: {
  href: string;
  label?: string;
  isSoldOut: boolean;
}) {
  if (isSoldOut) {
    return (
      <p className="inline-block border border-rule px-4 py-3 text-steel">
        지금은 품절입니다. 재입고되면 이 페이지의 링크가 다시 열립니다.
      </p>
    );
  }

  return (
    <a
      href={href}
      rel="nofollow sponsored noopener"
      target="_blank"
      className="inline-block bg-water px-5 py-3 font-medium text-paper hover:bg-ink"
    >
      {label ?? CTA_LABEL}
    </a>
  );
}
