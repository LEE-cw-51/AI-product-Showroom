import type { ShowroomSummary } from "@/lib/ai/schemas/showroom";

import { MarkedList } from "./primitives";

/**
 * GEO 핵심 블록. 항상 첫 번째 섹션이며 접히지 않는다.
 * 제품 뒷면의 사양 라벨처럼 실선 격자로 짜서, 사람도 기계도 한 번에 읽게 한다.
 */
export function Summary({
  summary,
  factsAsOf,
}: {
  summary: ShowroomSummary;
  factsAsOf: string;
}) {
  const rows = [
    { label: "무엇인가", body: <p>{summary.what}</p> },
    {
      label: "맞는 경우",
      body: <MarkedList items={summary.best_for} mark="plus" />,
    },
    {
      label: "안 맞는 경우",
      body: <MarkedList items={summary.not_for} mark="minus" />,
    },
    { label: "좋은 점", body: <MarkedList items={summary.pros} mark="plus" /> },
    {
      label: "아쉬운 점",
      body: <MarkedList items={summary.cons} mark="minus" />,
    },
  ];

  return (
    <section
      aria-labelledby="summary-heading"
      className="border border-ink/25 bg-paper"
    >
      <h2
        id="summary-heading"
        className="border-b border-ink/25 px-4 py-3 text-base font-semibold"
      >
        한눈에 보기
      </h2>
      <dl className="divide-y divide-rule">
        {rows.map((row) => (
          <div
            key={row.label}
            className="px-4 py-3 sm:grid sm:grid-cols-[7.5rem_1fr] sm:gap-4"
          >
            <dt className="mb-1 font-medium text-steel sm:mb-0">{row.label}</dt>
            <dd className="text-pretty">{row.body}</dd>
          </div>
        ))}
      </dl>
      <p className="border-t border-rule px-4 py-3 text-sm text-steel">
        {summary.price_note} 이 페이지의 사실 정보는 {factsAsOf} 기준입니다.
      </p>
    </section>
  );
}
