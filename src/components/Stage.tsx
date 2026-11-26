"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/IconSprite";
import { SlidingPill } from "@/components/SlidingPill";
import { TimelineCard } from "@/components/TimelineCard";
import {
  MONTH_NAMES_ID,
  MONTH_SHORT_EN,
  MONTH_SHORT_ID,
  SCALE_MODES,
} from "@/constants/theme";
import { collectDepEdges } from "@/engine/dependency";
import { buildTimelineModel } from "@/engine/layoutModel";
import { authClient } from "@/lib/authClient";
import { useTimeline } from "@/store/useTimelineStore";
import type { StatusKey } from "@/types/timeline";

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
    recalculateSchedule,
    showNotice,
    t,
  } = useTimeline();
  const scrollRef = useRef<HTMLDivElement>(null);
  const segRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const conflictRef = useRef<HTMLDivElement>(null);
  const [conflictsOpen, setConflictsOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"all" | StatusKey>("all");
  const [filterOwner, setFilterOwner] = useState<string>("all");
  const { data: session } = authClient.useSession();
  const myFirstName = (session?.user?.name || "").trim().toLowerCase().split(" ")[0];

  const distinctOwners = useMemo(() => {
    const set = new Set<string>();
    for (const r of activePage.rows) {
      if (r.type === "task" && r.owner?.trim()) {
        set.add(r.owner.trim());
      }
    }
    return Array.from(set).sort();
  }, [activePage.rows]);

  const model = useMemo(
    () => buildTimelineModel(activePage, project.mode, lang),
    [activePage, project.mode, lang]
  );

  const filteredModel = useMemo(() => {
    if (filterStatus === "all" && filterOwner === "all") return model;
    const isTaskMatch = (item: (typeof model.visibleRows)[number]) => {
      if (item.kind !== "task") return false;
      if (filterStatus !== "all" && item.st !== filterStatus) return false;
      if (filterOwner === "__me__") {
        const own = (item.row.owner || "").trim().toLowerCase();
        if (!myFirstName || !own.includes(myFirstName)) return false;
      } else if (filterOwner !== "all") {
        if ((item.row.owner || "").trim() !== filterOwner) return false;
      }
      return true;
    };

    const nextVisible: typeof model.visibleRows = [];
    for (let i = 0; i < model.visibleRows.length; i++) {
      const cur = model.visibleRows[i];
      if (cur.kind === "task") {
        if (isTaskMatch(cur)) nextVisible.push(cur);
      } else {
        // Keep group header only if at least one subsequent task before the next group matches
        let hasMatch = false;
        for (let j = i + 1; j < model.visibleRows.length; j++) {
          const nxt = model.visibleRows[j];
          if (nxt.kind === "group") break;
          if (isTaskMatch(nxt)) {
            hasMatch = true;
            break;
          }
        }
        if (hasMatch) nextVisible.push(cur);
      }
    }
    return { ...model, visibleRows: nextVisible };
  }, [filterOwner, filterStatus, model, myFirstName]);

  const conflictEdges = useMemo(
    () => collectDepEdges(activePage).filter((e) => e.conflict),
    [activePage]
  );

  useEffect(() => {
    if (!conflictsOpen) return;
    const onDown = (e: MouseEvent) => {
      if (
        conflictRef.current &&
        !conflictRef.current.contains(e.target as Node)
      ) {
        setConflictsOpen(false);
      }
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [conflictsOpen]);

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
        <div ref={segRef} className="seg" role="group" aria-label={t("pg.scale")}>
          <SlidingPill containerRef={segRef} deps={[project.mode, lang]} />
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

        <span className="tb-sep" role="separator" aria-orientation="vertical" />

        <div className="flex items-center gap-1.5" role="group" aria-label="Filters">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as "all" | StatusKey)}
            className="h-[26px] px-2 rounded-lg border border-[var(--line)] bg-white text-[11.5px] font-semibold text-[var(--ink-2)] cursor-pointer"
            title={lang === "en" ? "Filter by status" : "Filter status"}
          >
            <option value="all">{lang === "en" ? "All Status" : "Semua Status"}</option>
            <option value="atrisk">At Risk</option>
            <option value="inprogress">In Progress</option>
            <option value="done">{lang === "en" ? "Done" : "Selesai"}</option>
            <option value="notstarted">{lang === "en" ? "Not Started" : "Belum Mulai"}</option>
          </select>
          <select
            value={filterOwner}
            onChange={(e) => setFilterOwner(e.target.value)}
            className="h-[26px] px-2 rounded-lg border border-[var(--line)] bg-white text-[11.5px] font-semibold text-[var(--ink-2)] cursor-pointer max-w-[130px]"
            title={lang === "en" ? "Filter by assignee" : "Filter PIC / Tugas Saya"}
          >
            <option value="all">{lang === "en" ? "All PIC" : "Semua PIC"}</option>
            {myFirstName && (
              <option value="__me__">
                {lang === "en" ? "My Tasks" : "Tugas Saya"}
              </option>
            )}
            {distinctOwners.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          {(filterStatus !== "all" || filterOwner !== "all") && (
            <button
              type="button"
              onClick={() => {
                setFilterStatus("all");
                setFilterOwner("all");
              }}
              className="h-[26px] px-2 rounded-lg bg-[var(--brand-50)] text-[var(--brand-700)] text-[11px] font-bold hover:bg-[var(--brand-100)]"
            >
              Reset
            </button>
          )}
        </div>

        <div className="stats">
          {model.overall != null && (
            <span className="stat" title={lang === "en" ? "Overall progress" : "Progress keseluruhan"}>
              <Icon name="check-circle" />
              <span className="w-10 h-1.5 rounded-full bg-[#D8E0DB] overflow-hidden inline-block">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${model.overall}%`,
                    background: "var(--brand)",
                  }}
                />
              </span>
              <span>{model.overall}%</span>
            </span>
          )}

          {conflictEdges.length > 0 && (
            <div className="relative" ref={conflictRef}>
              <button
                type="button"
                onClick={() => setConflictsOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 h-[26px] px-2.5 rounded-[14px] bg-[#FFF1E0] text-[#9A5B13] hover:bg-[#FFE6C7] text-[11.5px] font-bold whitespace-nowrap transition-colors"
              >
                <Icon name="dep" size="xs" />
                <span>
                  {conflictEdges.length}{" "}
                  {lang === "en"
                    ? "dependency conflict(s)"
                    : "konflik dependency"}
                </span>
              </button>

              {conflictsOpen && (
                <div className="absolute right-0 top-full mt-2 z-[150] w-[360px] rounded-2xl border border-[#E2E8E4] bg-white shadow-2xl py-2 text-[12px]">
                  <div className="px-4 py-1.5 text-[10px] font-extrabold tracking-wider uppercase text-[var(--muted)]">
                    {lang === "en"
                      ? "DEPENDENCY CONFLICTS — CLICK TO EDIT"
                      : "KONFLIK DEPENDENCY"}
                  </div>
                  <div className="max-h-[280px] overflow-y-auto flex flex-col">
                    {conflictEdges.map((edge) => {
                      const fromRow = activePage.rows.find(
                        (r) => r.id === edge.fromId
                      );
                      const toRow = activePage.rows.find(
                        (r) => r.id === edge.toId
                      );
                      const reason =
                        edge.type === "FS"
                          ? lang === "en"
                            ? "start too early"
                            : "mulai terlalu cepat"
                          : edge.type === "SS"
                            ? lang === "en"
                              ? "start before predecessor"
                              : "mulai sebelum predecessor"
                            : edge.type === "FF"
                              ? lang === "en"
                                ? "finish before predecessor"
                                : "selesai sebelum predecessor"
                              : lang === "en"
                                ? "finish too early"
                                : "selesai terlalu cepat";
                      return (
                        <div
                          key={`${edge.fromId}-${edge.toId}-${edge.type}`}
                          className="flex items-start gap-2.5 px-4 py-2 hover:bg-[#FAFBF9] text-[var(--ink)]"
                        >
                          <Icon
                            name="alert"
                            size="sm"
                            className="text-[var(--muted)] shrink-0 mt-0.5"
                          />
                          <span className="leading-snug">
                            <span className="font-semibold">
                              {toRow?.name || edge.toId}
                            </span>{" "}
                            ← {fromRow?.name || edge.fromId} ({edge.type}):{" "}
                            <span className="text-[var(--ink-2)]">{reason}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-1 pt-1 border-t border-[#EEF2EF]">
                    <button
                      type="button"
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-left font-semibold text-[var(--ink)] hover:bg-[#F3F6F4] transition-colors"
                      onClick={() => {
                        recalculateSchedule();
                        setConflictsOpen(false);
                        showNotice(
                          lang === "en"
                            ? "Schedule recalculated!"
                            : "Jadwal dihitung ulang!"
                        );
                      }}
                    >
                      <Icon
                        name="reset"
                        size="sm"
                        className="text-[var(--muted)]"
                      />
                      <span>
                        {lang === "en"
                          ? "Recalculate schedule"
                          : "Hitung ulang jadwal"}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

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
              model={filteredModel}
              cardRef={cardRef}
              scale={project.zoom / 100}
              currentPeriodBadge={currentPeriodBadge}
            />
          </div>
        </div>

        {/* Empty State Overlay */}
        {activePage.rows.length === 0 && (
          <div className="tl-empty-wrap">
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
          </div>
        )}
      </div>
    </section>
  );
}
