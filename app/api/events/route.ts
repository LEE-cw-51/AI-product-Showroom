import { after } from "next/server";
import { z } from "zod";

import { getSql } from "@/lib/db/client";
import { findPublishedShowroomRef } from "@/lib/db/showrooms";
import { classifyReferrer } from "@/lib/events/referrer";
import { SITE } from "@/lib/site";

/**
 * 쇼룸 퍼널 이벤트 수집. ShowroomTracker 가 sendBeacon 으로 보낸다.
 *
 * 응답은 항상 바로 204 이고 기록은 after() 로 응답 뒤에 한다 — 잠든 DB 가
 * 깨어나는 시간을 방문자가 기다리지 않게. 없는 slug·봇도 같은 204 를 돌려
 * 무엇이 기록됐는지 밖에서 구분할 수 없게 한다.
 */

const MAX_BODY_BYTES = 2048;

const eventSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(72),
  type: z.enum(["page_view", "scroll_50", "cta_click"]),
  session_id: z.uuid(),
  referrer: z.string().max(1024).optional(),
  utm_source: z.string().max(100).optional(),
});

/** 사람의 퍼널만 센다. AI 크롤러 허용(robots)과는 별개다. */
const BOT_PATTERN =
  /bot|crawl|spider|slurp|headless|lighthouse|preview|fetch|curl|wget|python|axios|node/i;

const siteHost = new URL(SITE.url).hostname;

const noContent = () => new Response(null, { status: 204 });

export async function POST(request: Request) {
  const userAgent = request.headers.get("user-agent") ?? "";
  if (!userAgent || BOT_PATTERN.test(userAgent)) return noContent();

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    return new Response(null, { status: 413 });
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  const parsed = eventSchema.safeParse(json);
  if (!parsed.success) return new Response(null, { status: 400 });

  const event = parsed.data;
  // 경로·쿼리는 남기지 않는다. 채널 분석에는 출처 호스트면 충분하다.
  const referrerOrigin = originOf(event.referrer);

  after(async () => {
    const showroom = await findPublishedShowroomRef(event.slug);
    if (!showroom) return;

    const sql = getSql();
    await sql`
      insert into events (showroom_id, version_id, type, session_id, referrer, referrer_type)
      values (
        ${showroom.id}, ${showroom.versionId}, ${event.type}, ${event.session_id},
        ${referrerOrigin},
        ${classifyReferrer({ referrer: event.referrer, utmSource: event.utm_source, siteHost })}
      )
    `;
  });

  return noContent();
}

function originOf(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}
