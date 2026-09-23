import {
  approveDraftAction,
  rejectDraftAction,
} from "@/lib/admin/actions";
import type { ShowroomDraft } from "@/lib/pipeline/drafts";

import { DraftStatusMark } from "./DraftStatusMark";

export function DraftControls({ draft }: { draft: ShowroomDraft }) {
  const canApprove = draft.status === "review";
  const canReject =
    draft.status === "review" || draft.status === "failed";

  return (
    <aside className="border border-ink/25 bg-paper px-4 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <DraftStatusMark status={draft.status} />
        <span className="text-sm text-steel">
          {draft.taca_item_id} · {draft.prompt_version}
        </span>
      </div>

      <p className="mt-3 text-sm text-pretty">
        {draft.content.seo.h1}
      </p>
      <p className="mt-1 text-sm text-steel">
        slug: {draft.content.seo.slug}
      </p>

      {!draft.qa_result.passed && draft.qa_result.failures.length > 0 ? (
        <ul className="mt-4 space-y-2 border-t border-rule pt-4">
          {draft.qa_result.failures.map((f) => (
            <li key={`${f.code}-${f.message}`} className="text-sm">
              <span className="font-medium text-caution">[{f.code}]</span>{" "}
              <span className="text-pretty">{f.message}</span>
            </li>
          ))}
        </ul>
      ) : draft.status === "published" ? (
        <p className="mt-4 border-t border-rule pt-4 text-sm text-steel">
          발행됨. 공개 쇼룸 파일로 복사되었습니다.
        </p>
      ) : (
        <p className="mt-4 border-t border-rule pt-4 text-sm text-steel">
          QA를 통과한 초안입니다. 발행하면 공개 쇼룸으로 복사됩니다.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {canApprove ? (
          <form action={approveDraftAction}>
            <input type="hidden" name="taca_item_id" value={draft.taca_item_id} />
            <button
              type="submit"
              className="border border-water bg-water px-3 py-1.5 text-sm font-medium text-paper"
            >
              승인 · 발행
            </button>
          </form>
        ) : null}
        {canReject ? (
          <form action={rejectDraftAction}>
            <input type="hidden" name="taca_item_id" value={draft.taca_item_id} />
            <button
              type="submit"
              className="border border-ink/40 px-3 py-1.5 text-sm font-medium text-ink"
            >
              반려
            </button>
          </form>
        ) : null}
        {!canApprove && !canReject ? (
          <p className="text-sm text-steel">이 초안은 더 이상 상태를 바꿀 수 없습니다.</p>
        ) : null}
      </div>
    </aside>
  );
}
