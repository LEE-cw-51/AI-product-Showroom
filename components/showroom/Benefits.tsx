import type { ShowroomBenefit } from "@/lib/ai/schemas/showroom";

import { Section } from "./primitives";

export function Benefits({ benefits }: { benefits: readonly ShowroomBenefit[] }) {
  return (
    <Section title="어떤 기능이 무엇을 해결하는지">
      <dl className="divide-y divide-rule">
        {benefits.map((benefit) => (
          <div key={benefit.feature} className="py-4 first:pt-0">
            <dt className="font-medium">{benefit.feature}</dt>
            <dd className="mt-1 space-y-1 text-pretty">
              <p>{benefit.solves}</p>
              <p className="text-steel">{benefit.gain}</p>
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}
