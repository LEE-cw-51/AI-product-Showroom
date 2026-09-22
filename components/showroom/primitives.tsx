import type { ReactNode } from "react";

/** 섹션 사이 실선. 장식이 아니라 구획 표시다. */
export function Section({
  title,
  id,
  children,
}: {
  title?: string;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="border-t border-rule pt-8 pb-2">
      {title ? (
        <h2 className="mb-4 text-xl font-medium tracking-tight">{title}</h2>
      ) : null}
      {children}
    </section>
  );
}

/**
 * 왼쪽 여백의 기호로 목록의 성격을 표시한다.
 * plus = 맞는 경우·장점, minus = 안 맞는 경우·단점, box = 확인할 것.
 * 기호 자체가 정보이므로, 같은 뜻에는 페이지 전체에서 같은 기호를 쓴다.
 */
export function MarkedList({
  items,
  mark,
}: {
  items: readonly string[];
  mark: "plus" | "minus" | "box";
}) {
  const glyph = mark === "plus" ? "+" : mark === "minus" ? "−" : "□";
  const tone = mark === "minus" ? "text-steel" : "text-water";

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="grid grid-cols-[1.25rem_1fr] gap-x-1">
          <span aria-hidden className={`${tone} select-none`}>
            {glyph}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
