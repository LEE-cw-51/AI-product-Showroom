import Image from "next/image";
import Link from "next/link";

import { PALETTES } from "@/components/showroom/scene/palettes";
import { listShowrooms } from "@/lib/db/showrooms";
import { sceneImages } from "@/lib/showroom/images";
import { SITE, showroomPath } from "@/lib/site";

export const revalidate = 86400;

/**
 * 쇼룸 피드. 대표 사진·제목·한 줄 요약만 둔다.
 * 가격·할인율·정렬·필터처럼 쇼핑몰 목록으로 읽히는 요소는 두지 않는다
 * (토스 Open API 승인 기준의 "커머스형 웹사이트" 반려 사유).
 */
export default async function Home() {
  const showrooms = await listShowrooms();

  return (
    <main className="mx-auto w-full max-w-[64rem] px-4 pt-10 pb-16">
      <header className="flex items-baseline justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">{SITE.name}</h1>
        <Link href="/about" className="text-sm text-steel hover:text-water">
          소개
        </Link>
      </header>
      <p className="mt-3 max-w-[36rem] text-steel text-pretty">{SITE.tagline}</p>

      <ul className="mt-10 grid gap-8 sm:grid-cols-2">
        {showrooms.map((showroom) => {
          const palette = PALETTES[showroom.content.visual.palette];
          const [cover] = sceneImages(
            showroom.product.image_urls,
            showroom.content.visual.hero_image_url,
            1,
          );
          return (
            <li key={showroom.slug}>
              <Link href={showroomPath(showroom.slug)} className="group block">
                <div
                  className="relative aspect-[4/3] overflow-hidden"
                  style={{
                    background: `linear-gradient(180deg, ${palette.top}, ${palette.bottom})`,
                  }}
                >
                  {cover ? (
                    <Image
                      src={cover}
                      alt=""
                      fill
                      sizes="(min-width: 640px) 30rem, 100vw"
                      className="object-contain p-[12%] transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  ) : null}
                </div>
                <h2 className="mt-4 text-lg leading-snug font-medium text-balance group-hover:text-water">
                  {showroom.content.seo.h1}
                </h2>
                <p className="mt-1 text-sm text-steel text-pretty">
                  {showroom.content.summary.what}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
