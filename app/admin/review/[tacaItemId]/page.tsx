import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DraftControls } from "@/components/admin/DraftControls";
import { DraftShowroomPreview } from "@/components/admin/DraftShowroomPreview";
import { requireAdminPage } from "@/lib/admin/auth";
import { getFixtureProduct } from "@/lib/partners/fixtures";
import { readDraft } from "@/lib/pipeline/drafts";

export const metadata: Metadata = {
  title: "초안 검수",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ tacaItemId: string }>;
};

export default async function AdminReviewDetailPage({ params }: PageProps) {
  await requireAdminPage();
  const { tacaItemId: raw } = await params;
  const tacaItemId = Number(raw);
  if (!Number.isInteger(tacaItemId) || tacaItemId <= 0) {
    notFound();
  }

  const draft = await readDraft(tacaItemId);
  if (!draft) notFound();

  const product = await getFixtureProduct(tacaItemId);
  if (!product) {
    throw new Error(`픽스처 상품을 찾을 수 없습니다: ${tacaItemId}`);
  }

  return (
    <main className="mx-auto w-full max-w-[72rem] px-4 pt-8 pb-16">
      <p className="mb-6 text-sm">
        <Link href="/admin/review" className="text-water hover:underline">
          ← 검수 큐
        </Link>
      </p>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-4 lg:self-start">
          <DraftControls draft={draft} />
        </div>
        <section
          aria-label="초안 미리보기"
          className="border-t border-rule pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8"
        >
          <p className="mb-6 text-xs text-steel">미리보기 · 공개 페이지와 같은 구성</p>
          <DraftShowroomPreview content={draft.content} product={product} />
        </section>
      </div>
    </main>
  );
}
