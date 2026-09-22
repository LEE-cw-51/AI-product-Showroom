import Link from "next/link";

import { listShowrooms } from "@/lib/db/showrooms";
import { SITE, showroomPath } from "@/lib/site";

export const revalidate = 86400;

export default async function Home() {
  const showrooms = await listShowrooms();

  return (
    <main className="mx-auto w-full max-w-[42rem] px-4 pt-10 pb-16">
      <h1 className="text-3xl font-semibold tracking-tight">{SITE.name}</h1>
      <p className="mt-3 text-steel">{SITE.tagline}</p>

      <ul className="mt-10 divide-y divide-rule border-t border-rule">
        {showrooms.map((showroom) => (
          <li key={showroom.slug} className="py-4">
            <Link
              href={showroomPath(showroom.slug)}
              className="font-medium text-water hover:underline"
            >
              {showroom.content.seo.h1}
            </Link>
            <p className="mt-1 text-sm text-steel text-pretty">
              {showroom.content.summary.what}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
