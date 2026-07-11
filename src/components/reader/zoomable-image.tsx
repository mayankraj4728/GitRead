"use client";

import { useRef, useState } from "react";

interface Props {
  src: string;
  alt: string;
}

const MIN = 1;
const MAX = 4;

/**
 * Lightbox image with pinch-to-zoom (two-finger), double-tap-to-zoom, and drag
 * to pan while zoomed. Falls back to a plain image on non-touch devices.
 */
export function ZoomableImage({ src, alt }: Props) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);
  const dragStart = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const lastTap = useRef(0);

  const clamp = (s: number) => Math.min(MAX, Math.max(MIN, s));

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      pinchStart.current = { dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), scale };
    } else if (e.touches.length === 1 && scale > 1) {
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, px: pos.x, py: pos.y };
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStart.current) {
      e.stopPropagation();
      const [a, b] = [e.touches[0], e.touches[1]];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      setScale(clamp((dist / pinchStart.current.dist) * pinchStart.current.scale));
    } else if (e.touches.length === 1 && dragStart.current) {
      e.stopPropagation();
      const dx = e.touches[0].clientX - dragStart.current.x;
      const dy = e.touches[0].clientY - dragStart.current.y;
      setPos({ x: dragStart.current.px + dx, y: dragStart.current.py + dy });
    }
  };

  const onTouchEnd = () => {
    pinchStart.current = null;
    dragStart.current = null;
    if (scale <= 1.02) {
      setScale(1);
      setPos({ x: 0, y: 0 });
    }
  };

  const onDoubleTap = () => {
    if (scale > 1) {
      setScale(1);
      setPos({ x: 0, y: 0 });
    } else {
      setScale(2.2);
    }
  };

  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - lastTap.current < 300) onDoubleTap();
    lastTap.current = now;
  };

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      data-no-swipe
      draggable={false}
      onClick={onClick}
      onDoubleClick={onDoubleTap}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="max-h-[90vh] max-w-full touch-none select-none rounded-lg object-contain shadow-2xl"
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
        transition: pinchStart.current || dragStart.current ? "none" : "transform 0.2s ease",
        cursor: scale > 1 ? "grab" : "zoom-in",
      }}
    />
  );
}
