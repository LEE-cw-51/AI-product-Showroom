"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";

import type { ShowroomVisual } from "@/lib/ai/schemas/showroom";

import type { ScenePalette } from "./palettes";

/**
 * 상품 사진을 올린 WebGL 무대. ShowroomStage 가 next/dynamic(ssr: false) 으로만 불러온다.
 * 3D 모델 없이 사진 카드·받침대·떠다니는 조각·조명으로 연출한다.
 *
 * 입력은 두 가지다: 창 전체의 포인터 위치와, 무대가 화면 위로 빠져나간 정도(0~1).
 * 둘 다 ref 로 받아 매 프레임 읽고, React 상태로 올리지 않는다.
 */

export type SceneInput = {
  /** -1 ~ 1. 포인터가 없으면 0 에 머문다. */
  pointer: { x: number; y: number };
  /** 0 = 무대가 화면 맨 위, 1 = 무대가 화면 밖으로 다 나감 */
  scroll: number;
};

type Props = {
  preset: ShowroomVisual["preset"];
  palette: ScenePalette;
  /** 대표 이미지가 맨 앞. 이미 같은 출처 URL 이다. */
  textureUrls: string[];
  input: RefObject<SceneInput>;
  active: boolean;
  onReady: () => void;
};

const CARD_MAX = 2.3;
/** 이보다 세로로 긴 사진(상세 안내 이미지 등)은 위쪽만 잘라 쓴다. */
const MAX_PORTRAIT = 1.3;

// ---------------------------------------------------------------- 공용 도구

function easeOutCubic(t: number): number {
  const c = Math.min(Math.max(t, 0), 1);
  return 1 - (1 - c) ** 3;
}

/** 프레임 속도와 무관하게 target 쪽으로 따라가는 감쇠. */
function damp(current: number, target: number, lambda: number, dt: number): number {
  return THREE.MathUtils.damp(current, target, lambda, dt);
}

function roundedRectShape(w: number, h: number, r: number): THREE.Shape {
  const x = -w / 2;
  const y = -h / 2;
  const s = new THREE.Shape();
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** ShapeGeometry 의 UV 는 도형 좌표 그대로라서 0~1 로 다시 편다. */
function roundedPlane(w: number, h: number, r: number): THREE.ShapeGeometry {
  const geometry = new THREE.ShapeGeometry(roundedRectShape(w, h, r), 12);
  const pos = geometry.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) / w + 0.5;
    uv[i * 2 + 1] = pos.getY(i) / h + 0.5;
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geometry;
}

function roundedSlab(w: number, h: number, r: number, depth: number): THREE.ExtrudeGeometry {
  const geometry = new THREE.ExtrudeGeometry(roundedRectShape(w, h, r), {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.015,
    bevelSegments: 3,
    curveSegments: 12,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

/** 바닥에 까는 흐린 그림자. 그림자 맵 없이 방사형 그라디언트 한 장으로 끝낸다. */
function useBlobTexture(): THREE.CanvasTexture {
  return useMemo(() => {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(0,0,0,0.55)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
  }, []);
}

/**
 * 텍스처를 한꺼번에 불러온다. 실패한 장은 null 로 두고 카드가 무늬 없이 뜬다 —
 * 사진 하나 때문에 무대 전체가 사라지지 않게.
 */
function useTextures(urls: string[]): (THREE.Texture | null)[] | null {
  const [textures, setTextures] = useState<(THREE.Texture | null)[] | null>(null);
  const key = urls.join("|");

  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    Promise.all(
      urls.map(
        (url) =>
          new Promise<THREE.Texture | null>((resolve) => {
            loader.load(
              url,
              (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.anisotropy = 4;
                resolve(texture);
              },
              undefined,
              () => resolve(null),
            );
          }),
      ),
    ).then((loaded) => {
      if (cancelled) {
        loaded.forEach((t) => t?.dispose());
        return;
      }
      setTextures(loaded);
    });
    return () => {
      cancelled = true;
    };
    // key 가 urls 내용을 대신한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return textures;
}

// ---------------------------------------------------------------- 사진 카드

function PhotoCard({
  texture,
  palette,
}: {
  texture: THREE.Texture | null;
  palette: ScenePalette;
}) {
  const { width, height, map } = useMemo(() => {
    const image = texture?.image as { width: number; height: number } | undefined;
    const ratio = image ? image.height / image.width : 1;
    let map = texture;
    let shown = ratio;
    if (texture && ratio > MAX_PORTRAIT) {
      // 위쪽만 보이게 자른다. 복제본을 써서 다른 카드의 같은 텍스처에 영향이 없게.
      map = texture.clone();
      map.repeat.set(1, MAX_PORTRAIT / ratio);
      map.offset.set(0, 1 - MAX_PORTRAIT / ratio);
      map.needsUpdate = true;
      shown = MAX_PORTRAIT;
    }
    const w = shown > 1 ? CARD_MAX / shown : CARD_MAX;
    return { width: w, height: w * shown, map };
  }, [texture]);

  const pad = 0.08;
  const slab = useMemo(
    () => roundedSlab(width + pad * 2, height + pad * 2, 0.14, 0.05),
    [width, height],
  );
  const photo = useMemo(() => roundedPlane(width, height, 0.09), [width, height]);

  return (
    <group>
      <mesh geometry={slab}>
        <meshStandardMaterial color={palette.card} roughness={0.35} metalness={0.1} />
      </mesh>
      <mesh geometry={photo} position={[0, 0, 0.042]}>
        {/* 사진은 조명을 받지 않게 둔다. 판매처 사진 색이 무대 조명에 물들지 않도록. */}
        {map ? (
          <meshBasicMaterial map={map} toneMapped={false} />
        ) : (
          <meshStandardMaterial color={palette.accent} roughness={0.6} />
        )}
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------- 배경 조각

const SHARDS = Array.from({ length: 16 }, (_, i) => {
  // 결정적 난수 — 새로고침해도 같은 배치.
  const r = (n: number) => {
    const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  return {
    position: [(r(1) - 0.5) * 9, (r(2) - 0.5) * 5, -1.5 - r(3) * 3] as const,
    rotation: [r(4) * Math.PI, r(5) * Math.PI, 0] as const,
    size: 0.12 + r(6) * 0.28,
    speed: 0.3 + r(7) * 0.5,
    accent: r(8) > 0.6,
  };
});

function Shards({ palette, input }: { palette: ScenePalette; input: RefObject<SceneInput> }) {
  const group = useRef<THREE.Group>(null);
  const geometry = useMemo(() => roundedSlab(1, 1, 0.18, 0.08), []);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const { pointer, scroll } = input.current;
    const t = state.clock.elapsedTime;
    g.position.x = damp(g.position.x, pointer.x * -0.35, 3, dt);
    g.position.y = damp(g.position.y, pointer.y * -0.2 + scroll * 1.6, 3, dt);
    g.children.forEach((child, i) => {
      const s = SHARDS[i];
      child.rotation.x = s.rotation[0] + t * s.speed * 0.4;
      child.rotation.y = s.rotation[1] + t * s.speed * 0.3;
      child.position.y = s.position[1] + Math.sin(t * s.speed + i) * 0.12;
    });
  });

  return (
    <group ref={group}>
      {SHARDS.map((s, i) => (
        <mesh
          key={i}
          geometry={geometry}
          position={[...s.position]}
          rotation={[...s.rotation]}
          scale={s.size}
        >
          <meshStandardMaterial
            color={s.accent ? palette.accent : palette.card}
            roughness={0.3}
            metalness={0.2}
            transparent
            opacity={s.accent ? 0.85 : 0.7}
          />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- 프리셋

type PresetProps = {
  textures: (THREE.Texture | null)[];
  palette: ScenePalette;
  input: RefObject<SceneInput>;
};

/** 카드 한 장이 떠서 포인터를 따라 기운다. */
function FloatPreset({ textures, palette, input }: PresetProps) {
  const card = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Mesh>(null);
  const blob = useBlobTexture();

  useFrame((state, dt) => {
    const g = card.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const intro = easeOutCubic(t / 1.6);
    const { pointer, scroll } = input.current;
    g.rotation.y = damp(g.rotation.y, (1 - intro) * -0.9 + pointer.x * 0.4 + Math.sin(t * 0.5) * 0.06, 4, dt);
    g.rotation.x = damp(g.rotation.x, -pointer.y * 0.25 + scroll * 0.5, 4, dt);
    g.position.y = Math.sin(t * 1.1) * 0.07 + scroll * 1.2 + (1 - intro) * -0.6;
    g.scale.setScalar(0.85 + intro * 0.15 - scroll * 0.15);
    if (shadow.current) {
      const mat = shadow.current.material as THREE.MeshBasicMaterial;
      mat.opacity = (0.45 - Math.sin(t * 1.1) * 0.08) * intro * (1 - scroll);
    }
  });

  return (
    <>
      <group ref={card}>
        <PhotoCard texture={textures[0]} palette={palette} />
      </group>
      <mesh ref={shadow} position={[0, -1.75, -0.3]} rotation={[-Math.PI / 2, 0, 0]} scale={[3.2, 1.2, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={blob} transparent depthWrite={false} opacity={0} />
      </mesh>
    </>
  );
}

/** 여러 장이 겹쳐 있다가 부채꼴로 펼쳐진다. 스크롤하면 더 벌어진다. */
function StackPreset({ textures, palette, input }: PresetProps) {
  const group = useRef<THREE.Group>(null);
  const cards = useRef<(THREE.Group | null)[]>([]);
  const n = textures.length;

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const { pointer, scroll } = input.current;
    const spread = easeOutCubic((t - 0.3) / 1.4) * (1 + scroll * 0.6);
    cards.current.forEach((card, i) => {
      if (!card) return;
      // 대표(0번)가 맨 앞 가운데, 나머지는 뒤로 번갈아 좌우.
      const side = i === 0 ? 0 : i % 2 === 1 ? -1 : 1;
      const rank = Math.ceil(i / 2);
      const x = side * rank * 1.05 * spread;
      const z = -i * 0.35;
      const tilt = side * rank * 0.22 * spread;
      card.position.x = damp(card.position.x, x, 5, dt);
      card.position.z = z;
      card.position.y = Math.sin(t * 0.9 + i) * 0.05 - rank * 0.08 * spread;
      card.rotation.z = damp(card.rotation.z, -tilt * 0.5, 5, dt);
      card.rotation.y = damp(card.rotation.y, tilt, 5, dt);
    });
    const g = group.current;
    if (g) {
      g.rotation.y = damp(g.rotation.y, pointer.x * 0.3, 3, dt);
      g.rotation.x = damp(g.rotation.x, -pointer.y * 0.18 + scroll * 0.35, 3, dt);
      g.position.y = scroll * 1.1;
      g.scale.setScalar(n > 2 ? 0.78 : 0.88);
    }
  });

  return (
    <group ref={group}>
      {textures.map((texture, i) => (
        <group
          key={i}
          ref={(el) => {
            cards.current[i] = el;
          }}
          scale={i === 0 ? 1 : 0.86}
        >
          <PhotoCard texture={texture} palette={palette} />
        </group>
      ))}
    </group>
  );
}

/** 받침대 위 카드를 턴테이블처럼 돌리고, 조명이 옆으로 쓸고 지나간다. */
function StagePreset({ textures, palette, input }: PresetProps) {
  const turntable = useRef<THREE.Group>(null);
  const sweep = useRef<THREE.SpotLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const { pointer, scroll } = input.current;
    const intro = easeOutCubic(t / 1.8);
    const g = turntable.current;
    if (g) {
      g.rotation.y = damp(
        g.rotation.y,
        (1 - intro) * -1.6 + Math.sin(t * 0.35) * 0.45 + pointer.x * 0.35 + scroll * 1.4,
        3,
        dt,
      );
      g.position.y = -0.35 + scroll * 1.0;
    }
    if (sweep.current) {
      sweep.current.position.x = Math.sin(t * 0.6) * 4;
    }
    state.camera.position.y = damp(state.camera.position.y, 0.9 - pointer.y * 0.3, 2, dt);
    state.camera.lookAt(0, 0, 0);
  });

  return (
    <>
      <primitive object={target} position={[0, 0, 0]} />
      <spotLight
        ref={sweep}
        position={[0, 4, 3]}
        angle={0.35}
        penumbra={0.8}
        intensity={palette.dark ? 60 : 35}
        color="#ffffff"
        target={target}
      />
      <group ref={turntable}>
        <group position={[0, 0.25, 0]} scale={0.8}>
          <group position={[0, CARD_MAX / 2 - 0.35, 0]}>
            <PhotoCard texture={textures[0]} palette={palette} />
          </group>
        </group>
        <mesh position={[0, -0.55, 0]}>
          <cylinderGeometry args={[1.7, 1.8, 0.28, 64]} />
          <meshStandardMaterial color={palette.card} roughness={0.25} metalness={0.35} />
        </mesh>
        <mesh position={[0, -0.41, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.7, 0.018, 12, 96]} />
          <meshStandardMaterial
            color={palette.accent}
            emissive={palette.accent}
            emissiveIntensity={0.6}
          />
        </mesh>
      </group>
    </>
  );
}

// ---------------------------------------------------------------- 무대

function Scene({ preset, palette, textures, input }: PresetProps & { preset: Props["preset"] }) {
  // 세로로 긴 화면(모바일)에서는 무대 전체를 줄여 카드가 양옆으로 잘리지 않게 한다.
  const aspect = useThree((s) => s.size.width / s.size.height);
  const fit = THREE.MathUtils.clamp(aspect / 1.5, 0.55, 1);
  return (
    <>
      <ambientLight intensity={palette.dark ? 0.55 : 0.9} />
      <directionalLight position={[3, 4, 5]} intensity={palette.dark ? 1.6 : 1.8} />
      <pointLight position={[-4, 1, 2]} intensity={palette.dark ? 18 : 8} color={palette.accent} />
      <Shards palette={palette} input={input} />
      <group scale={fit}>
        {preset === "stack" ? (
          <StackPreset textures={textures} palette={palette} input={input} />
        ) : preset === "stage" ? (
          <StagePreset textures={textures} palette={palette} input={input} />
        ) : (
          <FloatPreset textures={textures} palette={palette} input={input} />
        )}
      </group>
    </>
  );
}

export default function ShowroomScene({
  preset,
  palette,
  textureUrls,
  input,
  active,
  onReady,
}: Props) {
  // 상세 안내 이미지(글자 위주)는 목록 뒤쪽에 있으므로 앞의 세 장만 쓴다.
  const urls = preset === "stack" ? textureUrls.slice(0, 3) : textureUrls.slice(0, 1);
  const textures = useTextures(urls);

  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop={active ? "always" : "never"}
      camera={{ position: [0, preset === "stage" ? 0.9 : 0, 6.2], fov: 35 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
      }}
    >
      {textures ? (
        <SceneReady onReady={onReady}>
          <Scene preset={preset} palette={palette} textures={textures} input={input} />
        </SceneReady>
      ) : null}
    </Canvas>
  );
}

/** 텍스처가 준비되어 첫 프레임을 그린 뒤에 정적 이미지를 걷어낸다. */
function SceneReady({ onReady, children }: { onReady: () => void; children: React.ReactNode }) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    onReady();
  });
  return <>{children}</>;
}
