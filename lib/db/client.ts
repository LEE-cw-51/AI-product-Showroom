import { neon, neonConfig, type NeonQueryFunction } from "@neondatabase/serverless";

/**
 * Neon HTTP 드라이버. 쿼리 하나가 fetch 한 번이라 서버리스 함수에서 커넥션을
 * 붙잡지 않는다. 여러 문장을 한 트랜잭션으로 묶을 때는 `sql.transaction([...])`.
 *
 * DATABASE_URL 은 NEXT_PUBLIC_ 이 아니므로 브라우저 번들에 들어가지 않는다.
 * CLI 스크립트도 이 파일을 쓰므로 `server-only` 는 붙이지 않는다.
 */

/**
 * 가장 최근 마이그레이션 번호. 마이그레이션을 추가하면 같이 올린다
 * (schema-version.test.mts 가 db/migrations 와 어긋나면 실패한다).
 *
 * 왜 필요한가: revalidate 를 쓰는 페이지 안의 fetch 는 Next 데이터 캐시에
 * 저장되고, 이 드라이버의 쿼리도 fetch 라서 결과가 캐시된다. 캐시 키는 SQL 과
 * 헤더로 만들어지므로 스키마가 바뀌어도 같은 쿼리는 옛 행 모양을 돌려준다
 * (빌드 캐시·Vercel 데이터 캐시는 배포를 넘어 남는다). 버전을 헤더에 넣어
 * 마이그레이션마다 캐시 키가 바뀌게 한다.
 */
export const SCHEMA_VERSION = "0002";

neonConfig.fetchFunction = (input: string, init: RequestInit = {}) => {
  const headers = new Headers(init.headers);
  headers.set("x-app-schema-version", SCHEMA_VERSION);
  return fetch(input, { ...init, headers });
};

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
