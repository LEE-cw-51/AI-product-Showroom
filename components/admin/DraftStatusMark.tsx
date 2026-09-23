import type { DraftStatus } from "@/lib/pipeline/drafts";

const LABELS: Record<DraftStatus, string> = {
  review: "검수 대기",
  failed: "QA 실패",
  published: "발행됨",
  rejected: "반려됨",
};

/** 상태 스탬프. 대시보드 뱃지 대신 잉크 도장처럼 읽히게 한다. */
export function DraftStatusMark({ status }: { status: DraftStatus }) {
  const tone =
    status === "review"
      ? "border-water text-water"
      : status === "failed"
        ? "border-caution text-caution"
        : status === "published"
          ? "border-ink/40 text-ink"
          : "border-steel text-steel";

  return (
    <span
      className={`inline-block border px-2 py-0.5 text-xs font-medium ${tone}`}
    >
      {LABELS[status]}
    </span>
  );
}
