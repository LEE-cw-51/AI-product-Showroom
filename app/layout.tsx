import type { Metadata } from "next";
import { IBM_Plex_Sans_KR } from "next/font/google";
import "./globals.css";

import { SITE } from "@/lib/site";

/**
 * 한 가족만 쓰고 굵기·크기로 위계를 만든다.
 * IBM Plex Sans KR 은 한글 지원이 있으면서 기본값처럼 쓰이는 얼굴이 아니다.
 */
const plexKr = IBM_Plex_Sans_KR({
  variable: "--font-plex-kr",
  // next/font 에는 한글 서브셋 이름이 없다. subsets 를 비우면 한글 범위까지
  // 내려오고, 그 경우 preload 를 끄는 것이 next/font 의 요구사항이다.
  // display: swap 이라 폰트가 늦게 와도 본문은 대체 글꼴로 먼저 보인다.
  preload: false,
  weight: ["400", "500", "600"],
  display: "swap",
  fallback: ["system-ui", "Apple SD Gothic Neo", "Malgun Gothic", "sans-serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.tagline,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${plexKr.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
