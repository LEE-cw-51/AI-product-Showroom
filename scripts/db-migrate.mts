/**
 * db/migrations/*.sql 을 이름 순으로 한 번씩 적용한다.
 *
 *   npm run db:migrate
 *
 * 적용 기록은 schema_migrations 에 남는다. 파일 하나가 트랜잭션 하나라서
 * 중간에 실패하면 그 파일은 통째로 롤백되고, 고친 뒤 다시 돌리면 이어서 적용한다.
 * 여러 문장을 한 번에 보내야 해서 HTTP 드라이버가 아니라 Pool(WebSocket)을 쓴다.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { Pool } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL 이 없습니다. .env.local 에 Neon 연결 문자열을 넣으세요.");
  process.exit(1);
}

const dir = path.join(process.cwd(), "db", "migrations");
const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

const pool = new Pool({ connectionString: url });
const client = await pool.connect();

try {
  await client.query(`
    create table if not exists schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `);
  const { rows } = await client.query<{ name: string }>(
    "select name from schema_migrations",
  );
  const applied = new Set(rows.map((r) => r.name));

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip   ${file}`);
      continue;
    }
    const body = await readFile(path.join(dir, file), "utf8");
    await client.query("begin");
    try {
      await client.query(body);
      await client.query("insert into schema_migrations (name) values ($1)", [file]);
      await client.query("commit");
    } catch (err) {
      await client.query("rollback");
      console.error(`FAIL   ${file}`);
      throw err;
    }
    console.log(`apply  ${file}`);
    count += 1;
  }
  console.log(count === 0 ? "적용할 마이그레이션이 없습니다." : `${count}개 적용.`);
} finally {
  client.release();
  await pool.end();
}
