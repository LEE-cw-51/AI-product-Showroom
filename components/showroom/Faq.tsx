import type { ShowroomFaqItem } from "@/lib/ai/schemas/showroom";

import { Section } from "./primitives";

/**
 * 접히지 않는다. GEO 요건상 JS 없이 본문 전체가 노출되어야 하고,
 * 답의 첫 문장이 곧 직답이므로 숨길 이유가 없다.
 */
export function Faq({ items }: { items: readonly ShowroomFaqItem[] }) {
  return (
    <Section title="자주 묻는 것">
      <div className="divide-y divide-rule">
        {items.map((item) => (
          <div key={item.q} className="py-4 first:pt-0">
            <h3 className="font-medium">{item.q}</h3>
            <p className="mt-2 text-pretty">{item.a}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
