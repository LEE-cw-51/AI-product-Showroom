import type { ShowroomVisual } from "@/lib/ai/schemas/showroom";

/**
 * 3D 무대의 색. 사이트 팔레트(젖은 스테인리스·타일)에서 벗어나지 않게 다섯 개로 묶었다.
 * 무대는 사진 스튜디오처럼 다크 모드와 상관없이 같은 색을 쓴다.
 */
export type ScenePalette = {
  /** 무대 배경 위·아래 그라디언트 */
  top: string;
  bottom: string;
  /** 떠다니는 조각·받침대 테두리·림 라이트 */
  accent: string;
  /** 카드 테두리(사진 뒤판) */
  card: string;
  /** 어두운 무대면 true — 조명 세기를 바꾼다 */
  dark: boolean;
};

export const PALETTES: Record<ShowroomVisual["palette"], ScenePalette> = {
  tile: { top: "#f2f5f3", bottom: "#c9d5d1", accent: "#0f6b74", card: "#fbfcfb", dark: false },
  steel: { top: "#eceeef", bottom: "#b3bbbf", accent: "#3d4a50", card: "#f7f8f8", dark: false },
  water: { top: "#e0f0ef", bottom: "#83bcbf", accent: "#0f6b74", card: "#f8fcfc", dark: false },
  moss: { top: "#e9f0e6", bottom: "#a7bea0", accent: "#3f6b3a", card: "#fafcf9", dark: false },
  slate: { top: "#2a3533", bottom: "#0e1413", accent: "#63c6ce", card: "#dfe6e4", dark: true },
};
