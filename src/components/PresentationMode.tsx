"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/IconSprite";
import { TimelineCard } from "@/components/TimelineCard";
import {
  MONTH_NAMES_ID,
  MONTH_SHORT_EN,
  MONTH_SHORT_ID,
} from "@/constants/theme";
import { buildTimelineModel } from "@/engine/layoutModel";
import { useTimeline } from "@/store/useTimelineStore";

export function PresentationMode() {
  const {
    project,
    activeModal,
    closeModal,
    setActivePage,
    lang,
  } = useTimeline();

  const cardRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const pageIdx = Math.max(
    0,
    project.pages.findIndex((p) => p.id === project.activePageId)
  );
  const page = project.pages[pageIdx] || project.pages[0];

  const model = useMemo(
    () => buildTimelineModel(page, project.mode, lang),
    [page, project.mode, lang]
  );

  const monthShorts = lang === "en" ? MONTH_SHORT_EN : MONTH_SHORT_ID;
  const cmIdx = MONTH_NAMES_ID.indexOf(
    page.cm as (typeof MONTH_NAMES_ID)[number]
  );
  const currentPeriodBadge = `W${page.cw} ${
    cmIdx >= 0 ? monthShorts[cmIdx] : page.cm
  } ${page.cy}`;

  useEffect(() => {
    if (activeModal !== "present") return;

    const updateFit = () => {
      const w = cardRef.current?.scrollWidth || 1100;
      const h = cardRef.current?.scrollHeight || 620;
      const sx = (window.innerWidth - 64) / w;
      const sy = (window.innerHeight - 110) / h;
      setScale(Math.max(0.35, Math.min(1.25, Math.min(sx, sy))));
    };

    const raf = requestAnimationFrame(updateFit);
    window.addEventListener("resize", updateFit);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updateFit);
    };
  }, [activeModal, page]);

  useEffect(() => {
    if (activeModal !== "present") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeModal();
      } else if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        if (pageIdx < project.pages.length - 1) {
          setActivePage(project.pages[pageIdx + 1].id);
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (pageIdx > 0) {
          setActivePage(project.pages[pageIdx - 1].id);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeModal, closeModal, pageIdx, project.pages, setActivePage]);

  if (activeModal !== "present") return null;

  return (
    <div
      className="fixed inset-0 z-[2500] bg-[#0B1710] flex flex-col items-center justify-center p-6 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Presentation mode"
    >
      {/* Top Floating Controls */}
      <div className="fixed top-4 right-5 flex items-center gap-2 z-30">
        {project.pages.length > 1 && (
          <div className="flex items-center gap-1 bg-white/10 backdrop-blur px-2.5 py-1 rounded-full text-white text-[12px] font-bold">
            <button
              type="button"
              disabled={pageIdx === 0}
              onClick={() => setActivePage(project.pages[pageIdx - 1].id)}
              className="p-1 disabled:opacity-35 hover:text-[#FF9A57]"
              aria-label="Previous slide"
            >
              <Icon name="chev-left" size="sm" />
            </button>
            <span>
              {pageIdx + 1} / {project.pages.length}
            </span>
            <button
              type="button"
              disabled={pageIdx === project.pages.length - 1}
              onClick={() => setActivePage(project.pages[pageIdx + 1].id)}
              className="p-1 disabled:opacity-35 hover:text-[#FF9A57]"
              aria-label="Next slide"
            >
              <Icon name="chev-right" size="sm" />
            </button>
          </div>
        )}
        <button
          type="button"
          className="h-8 px-3 rounded-full bg-white/15 hover:bg-white/25 text-white text-[12px] font-bold flex items-center gap-1.5"
          onClick={closeModal}
        >
          <Icon name="x" size="sm" />
          <span>Esc</span>
        </button>
      </div>

      {/* Centered Slide */}
      <div className="flex items-center justify-center">
        <div style={{ transform: `scale(${scale})`, transformOrigin: "center" }}>
          <TimelineCard
            model={model}
            cardRef={cardRef}
            scale={1}
            currentPeriodBadge={currentPeriodBadge}
          />
        </div>
      </div>

      <div className="fixed bottom-4 text-white/55 text-[11px] font-medium">
        {page.name} ·{" "}
        {lang === "en"
          ? "Use ← / → or Space to navigate, Esc to exit"
          : "Gunakan ← / → atau Spasi untuk navigasi, Esc untuk keluar"}
      </div>
    </div>
  );
}
