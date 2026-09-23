import type { Metadata } from "next";
import Link from "next/link";

import { DraftStatusMark } from "@/components/admin/DraftStatusMark";
import { requireAdminPage } from "@/lib/admin/auth";
import { listDrafts } from "@/lib/pipeline/drafts";

export const metadata: Metadata = {
  title: "검수 큐",
  robots: { index: false, follow: false },
};

/** 파일 기반이라 요청마다 디스크를 읽는다. */
export const dynamic = "force-dynamic";

export default async function AdminReviewListPage() {
  await requireAdminPage();
  const drafts = await listDrafts();

  return (
    <main className="mx-auto w-full max-w-[42rem] px-4 pt-10 pb-16">
      <h1 className="text-3xl font-semibold tracking-tight">검수 큐</h1>
      <p className="mt-2 text-steel text-pretty">
        QA를 통과한 초안만 승인할 수 있습니다. 실패 사유는 목록과 상세에
        그대로 남깁니다.
      </p>

      {drafts.length === 0 ? (
        <p className="mt-10 border-t border-rule pt-6 text-sm text-steel">
          초안이 없습니다.{" "}
          <code className="text-ink">npm run pipeline -- &lt;tacaItemId&gt;</code>
          로 생성하세요.
        </p>
      ) : (
        <ul className="mt-10 divide-y divide-rule border-t border-rule">
          {drafts.map((draft) => (
            <li key={draft.taca_item_id} className="py-5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
                <Link
                  href={`/admin/review/${draft.taca_item_id}`}
                  className="font-medium text-water hover:underline"
                >
                  {draft.content.seo.h1}
                </Link>
                <DraftStatusMark status={draft.status} />
              </div>
              <p className="mt-1 text-sm text-steel">
                {draft.taca_item_id} · {draft.content.seo.slug} ·{" "}
                {draft.prompt_version}
              </p>
              {!draft.qa_result.passed && draft.qa_result.failures.length > 0 ? (
                <ul className="mt-3 space-y-1">
                  {draft.qa_result.failures.map((f) => (
                    <li
                      key={`${f.code}-${f.message}`}
                      className="text-sm text-pretty"
                    >
                      <span className="text-caution">[{f.code}]</span>{" "}
                      {f.message}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
