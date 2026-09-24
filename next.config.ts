import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 상위 디렉터리의 관계없는 package-lock.json 을 추론 대상에서 제외한다.
  turbopack: { root: path.resolve(".") },
  images: {
    // 쇼룸 3D 씬은 상품 사진을 WebGL 텍스처로 쓴다. 토스 CDN 이 CORS 헤더를
    // 준다는 보장이 없으므로 같은 출처인 /_next/image 를 거쳐 불러온다.
    // 실제 API 응답의 이미지 호스트가 확인되면 여기에 맞춰 좁힌다.
    remotePatterns: [{ protocol: "https", hostname: "**.toss.im" }],
    qualities: [75],
  },
};

export default nextConfig;
