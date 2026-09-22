import { MarkedList, Section } from "./primitives";

export function Checklist({ items }: { items: readonly string[] }) {
  return (
    <Section title="사기 전에 확인할 것">
      <MarkedList items={items} mark="box" />
    </Section>
  );
}
