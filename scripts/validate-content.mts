/**
 * content/showrooms/*.json 을 쇼룸 스키마로 검증한다.
 * M2 의 자동 QA 가 들어오기 전까지, 수기 작성한 쇼룸 JSON 의 안전망 역할을 한다.
 *
 *   npm run validate:content
 *
 * Node 의 타입 스트리핑으로 실행하므로 빌드 단계가 필요 없다.
 * 경로 별칭(@/)은 쓰지 않는다 — 상대 경로여야 Node 가 그대로 해석한다.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { showroomContentSchema } from "../lib/ai/schemas/showroom.ts";

const CONTENT_DIR = path.join(process.cwd(), "content", "showrooms");

const files = (await readdir(CONTENT_DIR)).filter((f) => f.endsWith(".json"));
let failed = 0;

for (const file of files) {
  const slug = file.replace(/\.json$/, "");
  const raw = JSON.parse(await readFile(path.join(CONTENT_DIR, file), "utf8"));
  const result = showroomContentSchema.safeParse(raw.content);

  if (!result.success) {
    failed += 1;
    console.error(`FAIL  ${file}`);
    for (const issue of result.error.issues) {
      console.error(`      ${issue.path.join(".")}: ${issue.message}`);
    }
    continue;
  }

  if (result.data.seo.slug !== slug) {
    failed += 1;
    console.error(`FAIL  ${file}: seo.slug 가 "${result.data.seo.slug}" 라 파일명과 다르다`);
    continue;
  }

  if (typeof raw.taca_item_id !== "number") {
    failed += 1;
    console.error(`FAIL  ${file}: taca_item_id 가 없다`);
    continue;
  }

  console.log(`PASS  ${file}`);
}

if (failed > 0) {
  console.error(`\n${failed}개 파일이 스키마를 통과하지 못했다.`);
  process.exit(1);
}

console.log(`\n${files.length}개 파일 모두 통과.`);
