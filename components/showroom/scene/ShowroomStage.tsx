"use client";

import dynamic from "next/dynamic";
import Image, { getImageProps } from "next/image";
import { useEffect, useRef, useState } from "react";

import type { ShowroomVisual } from "@/lib/ai/schemas/showroom";

import { PALETTES } from "./palettes";
import type { SceneInput } from "./ShowroomScene";

/**
 * 쇼룸 첫 화면의 3D 무대.
 *
 * 서버 HTML 에는 대표 사진만 있다(검색·AI 크롤러, JS 없는 환경, 3D 를 못 쓰는 기기).
 * 브라우저가 3D 를 감당할 수 있으면 그 위에 WebGL 씬을 불러와 겹치고,
 * 첫 프레임이 그려진 뒤 사진을 걷어낸다. three.js 는 이 경우에만 내려받는다.
 */

const ShowroomScene = dynamic(() => import("./ShowroomScene"), { ssr: false });

/** 텍스처는 /_next/image 를 거친 같은 출처 URL 로 받는다 (CORS 회피, 크기 축소). */
function textureUrl(src: string): string {
  return getImageProps({ src, alt: "", width: 540, height: 540, quality: 75 }).props.src;
}

function canRender3D(): boolean {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean };
    deviceMemory?: number;
  };
  if (nav.connection?.saveData) return false;
  if (nav.hardwareConcurrency && nav.hardwareConcurrency <= 2) return false;
  if (nav.deviceMemory && nav.deviceMemory <= 2) return false;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    // 판정용 컨텍스트는 바로 놓아 준다. 브라우저의 활성 컨텍스트 수 제한을 쓰지 않게.
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return Boolean(gl);
  } catch {
    return false;
  }
}

export function ShowroomStage({
  visual,
  images,
  alt,
}: {
  visual: ShowroomVisual;
  /** 대표 사진이 맨 앞. imageSrc 로 바꾼 값. */
  images: string[];
  alt: string;
}) {
  const palette = PALETTES[visual.palette];
  const stage = useRef<HTMLElement>(null);
  const input = useRef<SceneInput>({ pointer: { x: 0, y: 0 }, scroll: 0 });
  const [enabled, setEnabled] = useState(false);
  const [active, setActive] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // 기기 판정은 브라우저에서만 할 수 있다. 서버 HTML 은 항상 사진 상태다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (images.length > 0 && canRender3D()) setEnabled(true);
  }, [images.length]);

  useEffect(() => {
    if (!enabled) return;
    const el = stage.current;
    if (!el) return;

    const onPointer = (e: PointerEvent) => {
      input.current.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      input.current.pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      input.current.scroll = Math.min(Math.max(-rect.top / rect.height, 0), 1);
    };
    // 화면 밖에서는 렌더 루프를 멈춘다.
    const observer = new IntersectionObserver(([entry]) => setActive(entry.isIntersecting));
    observer.observe(el);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      observer.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [enabled]);

  return (
    <section
      ref={stage}
      className="relative h-[min(76svh,680px)] min-h-[420px] w-full overflow-hidden"
      style={{ background: `linear-gradient(180deg, ${palette.top} 0%, ${palette.bottom} 100%)` }}
    >
      {images[0] ? (
        <Image
          src={images[0]}
          alt={alt}
          fill
          preload
          sizes="(min-width: 768px) 560px, 80vw"
          className={`object-contain p-[14%] transition-opacity duration-700 ${
            ready ? "opacity-0" : "opacity-100"
          }`}
        />
      ) : null}
      {enabled ? (
        <div
          aria-hidden
          className={`absolute inset-0 transition-opacity duration-700 ${
            ready ? "opacity-100" : "opacity-0"
          }`}
        >
          <ShowroomScene
            preset={visual.preset}
            palette={palette}
            textureUrls={images.map(textureUrl)}
            input={input}
            active={active}
            onReady={() => setReady(true)}
          />
        </div>
      ) : null}
    </section>
  );
}
