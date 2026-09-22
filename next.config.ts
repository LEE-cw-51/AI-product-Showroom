import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 상위 디렉터리의 관계없는 package-lock.json 을 추론 대상에서 제외한다.
  turbopack: { root: path.resolve(".") },
};

export default nextConfig;
