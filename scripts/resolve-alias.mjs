/**
 * Node 로더: `@/` → 프로젝트 루트.
 * scripts/*.mts 가 lib 의 경로 별칭 import 를 해석할 때 쓴다.
 *
 *   node --import ./scripts/resolve-alias.mjs scripts/pipeline.mts
 */
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./resolve-alias-hook.mjs", import.meta.url);
