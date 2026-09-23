import { logoutAdmin } from "@/lib/admin/actions";
import {
  isAdminAuthenticated,
  isAdminConfigured,
} from "@/lib/admin/auth";
import { notFound } from "next/navigation";

/**
 * ADMIN_SECRET 미설정 → 404.
 * 세션 확인·리다이렉트는 각 페이지의 requireAdminPage 가 담당한다.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isAdminConfigured()) {
    notFound();
  }

  const authed = await isAdminAuthenticated();

  return (
    <div className="min-h-full">
      {authed ? (
        <header className="border-b border-rule">
          <div className="mx-auto flex w-full max-w-[72rem] items-center justify-between gap-4 px-4 py-3">
            <p className="text-sm font-medium tracking-tight">검수대</p>
            <form action={logoutAdmin}>
              <button
                type="submit"
                className="text-sm text-steel hover:text-ink"
              >
                나가기
              </button>
            </form>
          </div>
        </header>
      ) : null}
      {children}
    </div>
  );
}
