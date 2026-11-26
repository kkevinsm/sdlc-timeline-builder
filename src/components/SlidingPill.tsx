"use client";

import React, { useLayoutEffect, useState } from "react";

export function SlidingPill({
  containerRef,
  activeSelector = '[aria-pressed="true"], .on',
  deps = [],
  className = "",
  style,
}: {
  containerRef: React.RefObject<HTMLElement | null>;
  activeSelector?: string;
  deps?: unknown[];
  className?: string;
  style?: React.CSSProperties;
}) {
  const [rect, setRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    ready: boolean;
  }>({ left: 0, top: 0, width: 0, height: 0, ready: false });

  useLayoutEffect(() => {
    const update = () => {
      const root = containerRef.current;
      if (!root) return;
      const active = root.querySelector<HTMLElement>(activeSelector);
      if (!active) {
        setRect((r) => (r.ready ? { ...r, ready: false } : r));
        return;
      }
      setRect({
        left: active.offsetLeft,
        top: active.offsetTop,
        width: active.offsetWidth,
        height: active.offsetHeight,
        ready: true,
      });
    };

    const raf = requestAnimationFrame(update);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSelector, ...deps]);

  if (!rect.ready) return null;

  return (
    <span
      aria-hidden="true"
      className={`sliding-pill ${className}`}
      style={{
        transform: `translate3d(${rect.left}px, ${rect.top}px, 0)`,
        width: rect.width,
        height: rect.height,
        ...style,
      }}
    />
  );
}
