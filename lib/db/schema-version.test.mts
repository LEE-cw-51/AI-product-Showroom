/**
 * SCHEMA_VERSION 이 마지막 마이그레이션 번호와 같은지. 어긋나면 마이그레이션 뒤에도
 * Next 데이터 캐시가 옛 행 모양을 돌려줄 수 있다 (lib/db/client.ts 참고).
 */
import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { it } from "node:test";

import { SCHEMA_VERSION } from "./client.ts";

it("SCHEMA_VERSION 은 마지막 마이그레이션 번호다", async () => {
  const files = (await readdir(path.join(process.cwd(), "db", "migrations")))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const latest = files.at(-1)?.split("_")[0];
  assert.equal(SCHEMA_VERSION, latest);
});
