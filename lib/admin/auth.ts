import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * 검수 큐 인증. ADMIN_SECRET 이 없으면 관리 라우트는 404.
 * 있으면 쿠키에 HMAC 세션 토큰을 두고 비교한다 (원문 비밀을 쿠키에 넣지 않는다).
 */

export const ADMIN_SESSION_COOKIE = "showroom_admin_session";

export function getAdminSecret(): string | undefined {
  const value = process.env.ADMIN_SECRET?.trim();
  return value && value.length > 0 ? value : undefined;
}

export function isAdminConfigured(): boolean {
  return Boolean(getAdminSecret());
}

function sessionToken(secret: string): string {
  return createHmac("sha256", secret).update("showroom-admin-v1").digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "utf8");
    const bufB = Buffer.from(b, "utf8");
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export function verifyAdminSecret(candidate: string): boolean {
  const secret = getAdminSecret();
  if (!secret) return false;
  return safeEqualHex(candidate, secret);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const secret = getAdminSecret();
  if (!secret) return false;
  const jar = await cookies();
  const value = jar.get(ADMIN_SESSION_COOKIE)?.value;
  if (!value) return false;
  return safeEqualHex(value, sessionToken(secret));
}

export async function setAdminSession(): Promise<void> {
  const secret = getAdminSecret();
  if (!secret) {
    throw new Error("ADMIN_SECRET 이 설정되어 있지 않습니다.");
  }
  const jar = await cookies();
  jar.set(ADMIN_SESSION_COOKIE, sessionToken(secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearAdminSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(ADMIN_SESSION_COOKIE);
}

/**
 * 페이지 게이트. ADMIN_SECRET 없으면 notFound.
 * allowUnauthed: 로그인 페이지용 — 이미 로그인하면 /admin/review 로 보낸다.
 */
export async function requireAdminPage(opts?: {
  allowUnauthed?: boolean;
}): Promise<void> {
  if (!isAdminConfigured()) {
    notFound();
  }
  const authed = await isAdminAuthenticated();
  if (!authed && !opts?.allowUnauthed) {
    redirect("/admin/login");
  }
  if (authed && opts?.allowUnauthed) {
    redirect("/admin/review");
  }
}
