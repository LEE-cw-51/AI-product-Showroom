import type { ShowroomProblem } from "@/lib/ai/schemas/showroom";

import { Section } from "./primitives";

export function Problem({ problem }: { problem: ShowroomProblem }) {
  return (
    <Section title={problem.title}>
      <ul className="space-y-3">
        {problem.points.map((point) => (
          <li key={point} className="border-l-2 border-rule pl-4">
            {point}
          </li>
        ))}
      </ul>
    </Section>
  );
}
