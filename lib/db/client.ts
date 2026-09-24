import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

/**
 * Neon HTTP 드라이버. 쿼리 하나가 fetch 한 번이라 서버리스 함수에서 커넥션을
 * 붙잡지 않는다. 여러 문장을 한 트랜잭션으로 묶을 때는 `sql.transaction([...])`.
 *
 * DATABASE_URL 은 NEXT_PUBLIC_ 이 아니므로 브라우저 번들에 들어가지 않는다.
 * CLI 스크립트도 이 파일을 쓰므로 `server-only` 는 붙이지 않는다.
 */

let cached: NeonQueryFunction<false, false> | null = null;

export function getSql(): NeonQueryFunction<false, false> {
  if (cached) return cached;
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL 이 없습니다. Neon 연결 문자열을 .env.local 에 넣으세요.",
    );
  }
  cached = neon(url);
  return cached;
}
