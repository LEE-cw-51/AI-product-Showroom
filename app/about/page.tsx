import type { Metadata } from "next";
import Link from "next/link";

import { DISCLOSURE, SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "소개",
  description: `${SITE.name}이 상품을 고르고 쓰는 기준.`,
};

/**
 * 운영자·콘텐츠 기준·수수료 고지. 토스 쉐어링크 Open API 신청 때 서비스 설명으로도 쓴다.
 * 운영자 정보가 확정되면 이 페이지와 lib/site.ts 만 고친다.
 */
export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-[42rem] px-4 pt-10 pb-16">
      <p className="text-sm">
        <Link href="/" className="text-water hover:underline">
          ← {SITE.name}
        </Link>
      </p>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">소개</h1>

      <div className="mt-8 space-y-8 text-pretty">
        <section>
          <h2 className="text-lg font-medium">무엇을 하는 곳인가</h2>
          <p className="mt-2">
            {SITE.name}은 생활용품 한 가지를 한 페이지에서 깊게 다룹니다. 어떤 자리에 맞고
            어떤 자리에는 맞지 않는지, 사기 전에 확인할 것을 먼저 적습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium">쓰는 기준</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>상품 정보는 판매처가 제공한 값만 씁니다. 수치를 지어내지 않습니다.</li>
            <li>가격은 적지 않습니다. 가격과 재고는 판매처에서 확인하세요.</li>
            <li>맞지 않는 사람과 단점도 함께 적습니다.</li>
            <li>페이지마다 사실 정보의 기준일을 표시합니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-medium">수수료 고지</h2>
          <p className="mt-2">{DISCLOSURE}</p>
        </section>
      </div>
    </main>
  );
}
