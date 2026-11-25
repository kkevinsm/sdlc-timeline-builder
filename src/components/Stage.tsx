"use client";

import React, { useMemo, useRef } from "react";
import { Icon } from "@/components/IconSprite";
import { TimelineCard } from "@/components/TimelineCard";
import {
  MONTH_NAMES_ID,
  MONTH_SHORT_EN,
  MONTH_SHORT_ID,
  SCALE_MODES,
} from "@/constants/theme";
import { buildTimelineModel } from "@/engine/layoutModel";
import { useTimeline } from "@/store/useTimelineStore";

function EmptyArtSvg() {
  return (
    <svg
      width="236"
      height="150"
      viewBox="0 0 236 150"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="18"
        y="16"
        width="200"
        height="118"
        rx="16"
        fill="#fff"
        stroke="#DCE5DF"
        strokeWidth="1.5"
      />
      <path
        d="M18 32a16 16 0 0 1 16-16h168a16 16 0 0 1 16 16v10H18z"
        fill="#EEF7F1"
      />
      <circle cx="34" cy="29" r="4" fill="#B4DCC1" />
      <rect x="44" y="26" width="56" height="6" rx="3" fill="#B4DCC1" />
      <path
        d="M86 42v92M134 42v92M182 42v92"
        stroke="#EEF2EF"
        strokeWidth="1.5"
      />
      <path
        d="M158 44v84"
        stroke="#1F2A24"
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />
      <rect x="30" y="56" width="70" height="9" rx="4.5" fill="#D9EEDF" />
      <rect x="30" y="56" width="44" height="9" rx="4.5" fill="#1B7A3E" />
      <circle
        cx="74"
        cy="60.5"
        r="6"
        fill="#F59E0B"
        stroke="#fff"
        strokeWidth="2"
      />
      <path
        d="M100 60.5h8v17.5h4"
        stroke="#66756D"
        strokeWidth="1.4"
        strokeDasharray="3 2"
      />
      <rect x="64" y="74" width="88" height="9" rx="4.5" fill="#D9EEDF" />
      <rect x="64" y="74" width="30" height="9" rx="4.5" fill="#34A05F" />
      <circle
        cx="94"
        cy="78.5"
        r="6"
        fill="#1B7A3E"
        stroke="#fff"
        strokeWidth="2"
      />
      <rect x="110" y="96" width="64" height="9" rx="4.5" fill="#E7ECE9" />
      <path
        d="M192 92.5l2.7 5.5 6 .9-4.35 4.25 1 6-5.35-2.8-5.35 2.8 1-6-4.35-4.25 6-.9z"
        fill="#FFB300"
        stroke="#E09200"
        strokeLinejoin="round"
      />
      <circle cx="204" cy="126" r="15" fill="#FF6A13" />
      <path
        d="M204 119v14M197 126h14"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Stage() {
  const {
    project,
    activePage,
    lang,
    setMode,
    setZoom,
    openModal,
    t,
  } = useTimeline();
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const model = useMemo(
    () => buildTimelineModel(activePage, project.mode, lang),
    [activePage, project.mode, lang]
  );

  const monthShorts = lang === "en" ? MONTH_SHORT_EN : MONTH_SHORT_ID;
  const cmIdx = MONTH_NAMES_ID.indexOf(
    activePage.cm as (typeof MONTH_NAMES_ID)[number]
  );
  const currentPeriodBadge = `W${activePage.cw} ${
    cmIdx >= 0 ? monthShorts[cmIdx] : activePage.cm
  } ${activePage.cy}`;

  const handleFitZoom = () => {
    const scrollEl = scrollRef.current;
    const cardEl = cardRef.current;
    if (!scrollEl || !cardEl) return;
    const avail = Math.max(300, scrollEl.clientWidth - 60);
    const natural = cardEl.scrollWidth || 1200;
    const pct = Math.max(
      30,
      Math.min(150, Math.floor(((avail / natural) * 100) / 5) * 5)
    );
    setZoom(pct);
  };

  return (
    <section id="stage">
      {/* Stage Toolbar */}
      <div className="toolbar" role="toolbar" aria-label="Canvas controls">
        <span className="tb-lbl">{t("pg.scale")}</span>
        <div className="seg" role="group" aria-label={t("pg.scale")}>
          {SCALE_MODES.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={project.mode === m}
              onClick={() => setMode(m)}
            >
              {t(`core.mode.${m}` as "core.mode.week")}
            </button>
          ))}
        </div>

        <span className="tb-sep" role="separator" aria-orientation="vertical" />

        <span className="tb-lbl">{t("pg.zoom")}</span>
        <div className="zoom" role="group" aria-label={t("pg.zoom")}>
          <button
            type="button"
            className="tbtn"
            title={t("pg.zoomout.t")}
            aria-label={t("pg.zoomout.t")}
            onClick={() => setZoom(project.zoom - 10)}
          >
            <Icon name="zoom-out" />
          </button>
          <input
            type="range"
            min={10}
            max={200}
            step={5}
            value={project.zoom}
            aria-label={t("pg.zoom")}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
          <button
            type="button"
            className="tbtn"
            title={t("pg.zoomin.t")}
            aria-label={t("pg.zoomin.t")}
            onClick={() => setZoom(project.zoom + 10)}
          >
            <Icon name="zoom-in" />
          </button>
          <button
            type="button"
            className="zv"
            title={t("pg.zoomreset.t")}
            onClick={() => setZoom(100)}
          >
            {project.zoom}%
          </button>
          <button
            type="button"
            className="tbtn"
            title={t("pg.fit.t")}
            onClick={handleFitZoom}
          >
            <Icon name="fit" />
            <span>{t("pg.fit")}</span>
          </button>
        </div>

        <div className="stats">
          <span className="stat">
            <Icon name="target" />
            <span>{currentPeriodBadge}</span>
          </span>
          <span className="stat">
            <Icon name="rows" />
            <span>
              {model.tasks.length} {t("stats.tasks")} · {model.cols.length}{" "}
              {t("stats.cols")} · {project.pages.length} {t("stats.pages")}
            </span>
          </span>
        </div>
      </div>

      {/* Dotted Canvas */}
      <div id="canvas">
        <div id="scroll" ref={scrollRef}>
          <div id="board">
            <TimelineCard
              model={model}
              cardRef={cardRef}
              scale={project.zoom / 100}
              currentPeriodBadge={currentPeriodBadge}
            />
          </div>
        </div>

        {/* Empty State Overlay */}
        {activePage.rows.length === 0 && (
          <div className="tl-empty">
            <EmptyArtSvg />
            <h3>{t("empty.title")}</h3>
            <p>{t("empty.desc")}</p>
            <div className="es-opts">
              <button
                type="button"
                className="es-opt main"
                onClick={() => openModal("plan")}
              >
                <span className="es-ic">
                  <Icon name="sparkle" />
                </span>
                <span className="es-tx">
                  <b>{t("empty.tpl.t")}</b>
                  <small>{t("empty.tpl.d")}</small>
                </span>
                <Icon name="chev-right" className="es-go" />
              </button>

              <button
                type="button"
                className="es-opt"
                onClick={() => openModal("paste")}
              >
                <span className="es-ic">
                  <Icon name="list" />
                </span>
                <span className="es-tx">
                  <b>{t("empty.list.t")}</b>
                  <small>{t("empty.list.d")}</small>
                </span>
                <Icon name="chev-right" className="es-go" />
              </button>
            </div>
            <button
              type="button"
              className="btn xs ghost es-sample"
              onClick={() => openModal("plan")}
            >
              <Icon name="wand" size="xs" />
              <span>{t("empty.examples")}</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
