"use client";

import { useEffect } from "react";

/**
 * 쇼룸 퍼널 이벤트(page_view, scroll_50, cta_click)를 /api/events 로 보낸다.
 * 아무것도 렌더하지 않는다 — 본문은 JS 없이도 전부 서버 HTML 에 있다.
 *
 * 세션 ID 는 탭 단위 sessionStorage 에만 두고 쿠키를 쓰지 않는다.
 * CTA 는 서버 컴포넌트로 두고, data-track="cta" 링크의 클릭을 위임으로 잡는다.
 */

type EventType = "page_view" | "scroll_50" | "cta_click";

const SESSION_KEY = "showroom_session_id";

function sessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    // 저장소가 막힌 브라우저: 이 페이지 안에서만 유지되는 ID.
    return crypto.randomUUID();
  }
}

function send(body: Record<string, string | undefined>): void {
  const payload = JSON.stringify(body);
  const blob = new Blob([payload], { type: "application/json" });
  // 새 탭으로 나가는 CTA 클릭도 유실되지 않게 beacon 을 먼저 쓴다.
  if (navigator.sendBeacon?.("/api/events", blob)) return;
  void fetch("/api/events", {
    method: "POST",
    body: payload,
    headers: { "content-type": "application/json" },
    keepalive: true,
  }).catch(() => {});
}

export function ShowroomTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const session_id = sessionId();
    const referrer = document.referrer || undefined;
    const utm_source =
      new URLSearchParams(window.location.search).get("utm_source") ?? undefined;
    const track = (type: EventType) =>
      send({ slug, type, session_id, referrer, utm_source });

    track("page_view");

    let scrolled = false;
    const onScroll = () => {
      if (scrolled) return;
      const seen = window.scrollY + window.innerHeight;
      if (seen >= document.documentElement.scrollHeight * 0.5) {
        scrolled = true;
        track("scroll_50");
        window.removeEventListener("scroll", onScroll);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // 화면보다 짧은 페이지는 열자마자 절반을 본 것이다.

    const onCtaClick = (event: MouseEvent) => {
      // 가운데 버튼(auxclick)은 새 탭 열기라 세되, 오른쪽 버튼은 세지 않는다.
      if (event.button !== 0 && event.button !== 1) return;
      const target = event.target as Element | null;
      if (target?.closest('a[data-track="cta"]')) track("cta_click");
    };
    document.addEventListener("click", onCtaClick);
    document.addEventListener("auxclick", onCtaClick);

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onCtaClick);
      document.removeEventListener("auxclick", onCtaClick);
    };
  }, [slug]);

  return null;
}
