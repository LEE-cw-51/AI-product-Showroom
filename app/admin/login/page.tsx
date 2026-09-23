import type { Metadata } from "next";

import { LoginForm } from "@/components/admin/LoginForm";
import { requireAdminPage } from "@/lib/admin/auth";

export const metadata: Metadata = {
  title: "검수대 로그인",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  await requireAdminPage({ allowUnauthed: true });

  return (
    <main className="mx-auto w-full max-w-[24rem] px-4 pt-16 pb-16">
      <h1 className="text-2xl font-semibold tracking-tight">검수대</h1>
      <p className="mt-2 text-sm text-steel text-pretty">
        발행 전 초안을 읽고 승인하거나 반려하는 자리입니다.
      </p>
      <LoginForm />
    </main>
  );
}
