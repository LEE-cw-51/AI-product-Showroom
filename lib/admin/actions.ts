"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  clearAdminSession,
  isAdminAuthenticated,
  isAdminConfigured,
  setAdminSession,
  verifyAdminSecret,
} from "@/lib/admin/auth";
import {
  approveDraft,
  rejectDraft,
} from "@/lib/pipeline/drafts";

async function requireAdmin(): Promise<void> {
  if (!isAdminConfigured() || !(await isAdminAuthenticated())) {
    throw new Error("권한이 없습니다.");
  }
}

export async function loginAdmin(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  if (!isAdminConfigured()) {
    return { error: "관리자 기능이 꺼져 있습니다." };
  }

  const secret = String(formData.get("secret") ?? "");
  if (!verifyAdminSecret(secret)) {
    return { error: "비밀키가 맞지 않습니다." };
  }

  await setAdminSession();
  redirect("/admin/review");
}

export async function logoutAdmin(): Promise<void> {
  await clearAdminSession();
  redirect("/admin/login");
}

export async function approveDraftAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("taca_item_id"));
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("잘못된 초안 ID");
  }
  await approveDraft(id);
  revalidatePath("/admin/review");
  revalidatePath(`/admin/review/${id}`);
  redirect(`/admin/review/${id}`);
}

export async function rejectDraftAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(formData.get("taca_item_id"));
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("잘못된 초안 ID");
  }
  await rejectDraft(id);
  revalidatePath("/admin/review");
  revalidatePath(`/admin/review/${id}`);
  redirect(`/admin/review/${id}`);
}
