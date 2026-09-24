/**
 * 상품 이미지 URL → 화면에서 쓸 src.
 *
 * 픽스처의 이미지 호스트(static.example-cdn.test)는 실제로 없는 주소라서
 * public/fixtures 아래의 같은 경로 파일로 바꿔 준다. 실제 API 이미지는 그대로 둔다.
 */
const FIXTURE_HOST = "static.example-cdn.test";

export function imageSrc(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === FIXTURE_HOST) return parsed.pathname;
  } catch {
    // 상대 경로는 그대로 쓴다.
  }
  return url;
}

/**
 * 씬에 올릴 이미지 목록. 대표 이미지를 맨 앞에 두고 나머지를 순서대로 잇는다.
 * 대표 URL 이 현재 상품 이미지에 없으면(판매처가 사진을 뺀 경우) 첫 이미지를 쓴다.
 */
export function sceneImages(
  imageUrls: string[],
  heroUrl: string | undefined,
  max: number,
): string[] {
  if (imageUrls.length === 0) return [];
  const hero = heroUrl && imageUrls.includes(heroUrl) ? heroUrl : imageUrls[0];
  return [hero, ...imageUrls.filter((u) => u !== hero)]
    .slice(0, max)
    .map(imageSrc);
}
