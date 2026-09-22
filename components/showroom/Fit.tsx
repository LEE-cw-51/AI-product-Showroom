import type { ShowroomFit } from "@/lib/ai/schemas/showroom";

import { MarkedList, Section } from "./primitives";

export function Fit({ fit }: { fit: ShowroomFit }) {
  return (
    <Section title="누구에게 맞고, 누구에게 안 맞는지">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="mb-3 font-medium">이런 사람에게</h3>
          <MarkedList items={fit.recommended} mark="plus" />
        </div>
        <div>
          <h3 className="mb-3 font-medium">이런 사람에게는 권하지 않는다</h3>
          <MarkedList items={fit.not_recommended} mark="minus" />
        </div>
      </div>
    </Section>
  );
}
