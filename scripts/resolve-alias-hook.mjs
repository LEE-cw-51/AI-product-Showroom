import path from "node:path";
import { pathToFileURL } from "node:url";
import { existsSync } from "node:fs";

const root = process.cwd();

function resolveAlias(specifier) {
  const relative = specifier.slice(2); // strip @/
  const base = path.join(root, relative);

  if (existsSync(base)) {
    return pathToFileURL(base).href;
  }

  for (const ext of [".ts", ".tsx", ".mts", ".js", ".mjs"]) {
    const withExt = base.endsWith(ext) ? base : `${base}${ext}`;
    if (existsSync(withExt)) {
      return pathToFileURL(withExt).href;
    }
  }

  // index fallback
  for (const ext of [".ts", ".tsx", ".js"]) {
    const index = path.join(base, `index${ext}`);
    if (existsSync(index)) {
      return pathToFileURL(index).href;
    }
  }

  return pathToFileURL(base).href;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    return nextResolve(resolveAlias(specifier), context);
  }
  return nextResolve(specifier, context);
}
