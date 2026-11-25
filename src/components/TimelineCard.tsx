"use client";

import React, { useMemo, useState } from "react";
import { Icon } from "@/components/IconSprite";
import { STATUS_META } from "@/constants/theme";
import {
  addDays,
  fmtISO,
  formatRangeLabel,
  makeCalendarContext,
  monthName,
  nextWD,
  prevWD,
  weekOf,
} from "@/engine/calendar";
import { collectDepEdges, routeDepPath } from "@/engine/dependency";
import type { TimelineModel } from "@/engine/layoutModel";
import { useTimeline } from "@/store/useTimelineStore";

interface TimelineCardProps {
  model: TimelineModel;
  cardRef: React.RefObject<HTMLDivElement | null>;
  scale: number;
  currentPeriodBadge: string;
}

interface DragPreview {
  rowId: string;
  duStart: number;
  duEnd: number;
}

export function TimelineCard({
  model,
  cardRef,
  scale,
  currentPeriodBadge,
}: TimelineCardProps) {
  const { lang, toggleGroupCollapse, updateBarAndCascade, t } = useTimeline();
  const { page, cols, monthGroups, colW, visibleRows, tu, railMarks } = model;
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);

  const gridWidth = cols.length * colW;
  const fixedColsWidth =
    page.lw + (page.showOwner ? page.ow : 0) + page.dw + page.sw;

  const totalBodyHeight = Math.max(
    visibleRows.length * page.rh,
    page.rows.length === 0 ? 5 * page.rh : visibleRows.length * page.rh
  );

  const rowYMap = useMemo(() => {
    const map = new Map<string, number>();
    visibleRows.forEach((it, idx) => {
      map.set(it.row.id, idx * page.rh + page.rh / 2);
    });
    return map;
  }, [visibleRows, page.rh]);

  const depEdges = useMemo(() => {
    if (!page.showDeps) return [];
    return collectDepEdges(page);
  }, [page]);

  const startBarDrag = (
    e: React.PointerEvent<HTMLDivElement>,
    rowId: string,
    mode: "move" | "left" | "right",
    sd: Date,
    ed: Date,
    u0: number,
    u1: number
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const avgDaysPerCol =
      cols.length > 0
        ? cols.reduce((s, c) => s + c.days, 0) / cols.length
        : 7;

    const computeDeltaDays = (clientX: number) => {
      const dx = (clientX - startX) / (colW * scale);
      return Math.round(dx * avgDaysPerCol);
    };

    const onMove = (ev: PointerEvent) => {
      const du = (ev.clientX - startX) / (colW * scale);
      if (mode === "move") {
        setDragPreview({ rowId, duStart: du, duEnd: du });
      } else if (mode === "left") {
        const clampedDu = Math.min(du, Math.max(0, u1 - u0 - 0.15));
        setDragPreview({ rowId, duStart: clampedDu, duEnd: 0 });
      } else {
        const clampedDu = Math.max(du, -(u1 - u0 - 0.15));
        setDragPreview({ rowId, duStart: 0, duEnd: clampedDu });
      }
    };

    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setDragPreview(null);

      const deltaDays = computeDeltaDays(ev.clientX);
      if (deltaDays === 0) return;

      const ctx = makeCalendarContext(page);
      let newSd = new Date(sd);
      let newEd = new Date(ed);

      if (mode === "move") {
        newSd = addDays(sd, deltaDays);
        newEd = addDays(ed, deltaDays);
      } else if (mode === "left") {
        newSd = addDays(sd, deltaDays);
        if (newSd > newEd) newSd = new Date(newEd);
      } else {
        newEd = addDays(ed, deltaDays);
        if (newEd < newSd) newEd = new Date(newSd);
      }

      if (page.wdSnap) {
        newSd = nextWD(ctx, newSd);
        newEd = prevWD(ctx, newEd);
        if (newEd < newSd) newEd = new Date(newSd);
      }

      const row = page.rows.find((r) => r.id === rowId);
      if (!row?.bar) return;

      if (page.dateMode === "day" || row.bar.sd) {
        updateBarAndCascade(rowId, {
          sd: fmtISO(newSd),
          ed: fmtISO(newEd),
          startMonth: monthName(newSd.getMonth(), "id"),
          startWeek: weekOf(newSd),
          startYear: newSd.getFullYear(),
          endMonth: monthName(newEd.getMonth(), "id"),
          endWeek: weekOf(newEd),
          endYear: newEd.getFullYear(),
        });
      } else {
        updateBarAndCascade(rowId, {
          startMonth: monthName(newSd.getMonth(), "id"),
          startWeek: weekOf(newSd),
          startYear: newSd.getFullYear(),
          endMonth: monthName(newEd.getMonth(), "id"),
          endWeek: weekOf(newEd),
          endYear: newEd.getFullYear(),
        });
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div
      id="tl-card"
      ref={cardRef}
      className="tl"
      style={
        {
          "--fs": `${page.fs}px`,
          "--rh": `${page.rh}px`,
          "--acc": page.accent,
          transform: `scale(${scale})`,
        } as React.CSSProperties
      }
    >
      {/* Slide Header */}
      <div className="tl-head">
        <div className="tl-hl">
          {(page.logoL || page.logl) && (
            <div className="tl-logo">
              {page.logoL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={page.logoL} alt="Left logo" />
              ) : (
                <span
                  className="fb text-white"
                  style={{ background: page.loglc }}
                >
                  {page.logl}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="tl-titles">
          <div className="tl-title">{page.title || "Timeline Project"}</div>
          <div className="tl-sub">{page.subtitle || "+ subtitle"}</div>
        </div>

        <div className="tl-hr">
          {page.tgt && (
            <span
              className="tl-badge text-white"
              style={{ background: page.tgtc }}
            >
              <Icon name="flag" size="sm" />
              <span>{page.tgt}</span>
            </span>
          )}
          {(page.logoR || page.logr) && (
            <div className="tl-logo r">
              {page.logoR ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={page.logoR} alt="Right logo" />
              ) : (
                <span
                  className="fb text-white"
                  style={{ background: page.logrc }}
                >
                  {page.logr}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="tl-rule" />

      {/* Legend */}
      {page.showLegend && (
        <div className="tl-legend">
          <span className="text-[10px] font-extrabold tracking-wider text-[var(--muted)] uppercase">
            STATUS
          </span>
          {(["done", "inprogress", "atrisk", "notstarted"] as const).map(
            (st) => (
              <span key={st} className="lg">
                <span
                  className="dot"
                  style={{ background: STATUS_META[st].color }}
                />
                <span>{t(`st.${st}.label`)}</span>
              </span>
            )
          )}
          <span className="lg">
            <span className="text-[#E09200] leading-none">★</span>
            <span>Milestone</span>
          </span>
          {page.showToday && tu != null && (
            <span className="text-[var(--muted)] font-medium">
              ¦ {lang === "en" ? "This week" : "Minggu ini"} ·{" "}
              {currentPeriodBadge}
            </span>
          )}
          {model.overall != null && (
            <span className="ml-auto font-extrabold text-[var(--brand-700)] bg-[var(--brand-50)] px-2.5 py-0.5 rounded-full">
              {lang === "en" ? "Overall" : "Total"}: {model.overall}%
            </span>
          )}
        </div>
      )}

      {/* Main Gantt Table */}
      <div className="px-[22px] pb-[18px]">
        <div
          className="border border-[#D8E0DB] rounded-[10px] overflow-hidden bg-white relative"
          style={{ width: fixedColsWidth + gridWidth }}
        >
          {/* Sticky Header Row */}
          <div className="flex border-b border-[#D8E0DB]">
            <div
              className="shrink-0 flex items-center px-3 font-extrabold text-[10px] uppercase tracking-wider text-white"
              style={{ width: page.lw, background: page.accent }}
            >
              TASK
            </div>
            {page.showOwner && (
              <div
                className="shrink-0 flex items-center justify-center font-extrabold text-[10px] uppercase tracking-wider text-white border-l border-white/20"
                style={{ width: page.ow, background: page.accent }}
              >
                PIC
              </div>
            )}
            <div
              className="shrink-0 flex items-center justify-center font-extrabold text-[10px] uppercase tracking-wider text-white border-l border-white/20"
              style={{ width: page.dw, background: page.accent }}
            >
              {lang === "en" ? "DURATION" : "DURASI"}
            </div>
            <div
              className="shrink-0 flex items-center justify-center font-extrabold text-[10px] uppercase tracking-wider text-white border-l border-white/20"
              style={{ width: page.sw, background: page.accent }}
            >
              STATUS
            </div>

            <div className="flex flex-col shrink-0">
              {model.mode !== "month" && (
                <div className="flex">
                  {monthGroups.map((mg) => (
                    <div
                      key={`${mg.mIdx}-${mg.year}`}
                      className="text-center text-white font-extrabold text-[10.5px] py-1 px-1.5 border-l border-white/25 whitespace-nowrap overflow-hidden text-ellipsis"
                      style={{ width: mg.n * colW, background: page.accent }}
                    >
                      {mg.label}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex bg-[#F7FAF8]">
                {cols.map((col, ci) => (
                  <div
                    key={`${col.month}-${col.year}-${col.label}-${ci}`}
                    className={`text-center text-[10px] font-bold py-1 border-l border-[#E2E8E4] shrink-0 whitespace-nowrap overflow-hidden ${
                      col.hasHoliday
                        ? "bg-[#FEF2F2] text-[#C62828]"
                        : col.off
                          ? "bg-[#F1F5F2] text-[var(--muted)]"
                          : "text-[var(--ink-2)]"
                    }`}
                    style={{ width: colW }}
                    title={col.holidayNames?.join(", ")}
                  >
                    {col.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Table Body */}
          <div className="relative" style={{ minHeight: totalBodyHeight }}>
            {/* Background Column Grid + Today Line */}
            <div
              className="absolute top-0 bottom-0 right-0 pointer-events-none flex"
              style={{ left: fixedColsWidth, width: gridWidth }}
            >
              {cols.map((col, ci) => (
                <div
                  key={`bg-${ci}`}
                  className={`h-full border-l border-[#EEF2EF] shrink-0 ${
                    col.hasHoliday
                      ? "bg-[#FFF5F5]/60"
                      : col.off
                        ? "bg-[#F5F7F6]/70"
                        : ""
                  }`}
                  style={{ width: colW }}
                />
              ))}
              {page.showToday && tu != null && (
                <div
                  className="absolute top-0 bottom-0 w-[2px] border-l-2 border-dashed border-[#1F2A24]/80 z-20"
                  style={{ left: tu * colW }}
                />
              )}
            </div>

            {/* Dependency SVG Overlay */}
            {page.showDeps && depEdges.length > 0 && (
              <svg
                className="absolute top-0 bottom-0 pointer-events-none z-15"
                style={{
                  left: fixedColsWidth,
                  width: gridWidth,
                  height: totalBodyHeight,
                }}
              >
                <defs>
                  <marker
                    id="dep-arrow-ok"
                    markerWidth="6"
                    markerHeight="6"
                    refX="5"
                    refY="3"
                    orient="auto"
                  >
                    <path d="M0,0 L6,3 L0,6 Z" fill={page.depColor} />
                  </marker>
                  <marker
                    id="dep-arrow-bad"
                    markerWidth="6"
                    markerHeight="6"
                    refX="5"
                    refY="3"
                    orient="auto"
                  >
                    <path d="M0,0 L6,3 L0,6 Z" fill="#E53935" />
                  </marker>
                </defs>
                {depEdges.map((edge) => {
                  const fromItem = model.byId.get(edge.fromId);
                  const toItem = model.byId.get(edge.toId);
                  const y1 = rowYMap.get(edge.fromId);
                  const y2 = rowYMap.get(edge.toId);
                  if (
                    !fromItem ||
                    !toItem ||
                    fromItem.kind !== "task" ||
                    toItem.kind !== "task" ||
                    y1 == null ||
                    y2 == null ||
                    fromItem.u0 == null ||
                    fromItem.u1 == null ||
                    toItem.u0 == null ||
                    toItem.u1 == null
                  ) {
                    return null;
                  }
                  const x1 =
                    (edge.type === "SS" || edge.type === "SF"
                      ? fromItem.u0
                      : fromItem.u1) * colW;
                  const x2 =
                    (edge.type === "FF" || edge.type === "SF"
                      ? toItem.u1
                      : toItem.u0) * colW;
                  const d = routeDepPath(x1, y1, x2, y2, edge.type);
                  return (
                    <path
                      key={`${edge.fromId}-${edge.toId}-${edge.type}`}
                      d={d}
                      fill="none"
                      stroke={edge.conflict ? "#E53935" : page.depColor}
                      strokeWidth={edge.conflict ? 1.8 : 1.4}
                      strokeDasharray={edge.conflict ? "3 2" : undefined}
                      markerEnd={
                        edge.conflict
                          ? "url(#dep-arrow-bad)"
                          : "url(#dep-arrow-ok)"
                      }
                    />
                  );
                })}
              </svg>
            )}

            {/* Empty skeleton rows */}
            {visibleRows.length === 0 &&
              [0, 1, 2, 3, 4].map((r) => (
                <div
                  key={`sk-${r}`}
                  className="flex border-t border-[var(--line-2)]"
                  style={{ height: page.rh }}
                >
                  <div
                    className="shrink-0 border-r border-[var(--line-2)]"
                    style={{ width: fixedColsWidth }}
                  />
                </div>
              ))}

            {/* Actual Data Rows */}
            {visibleRows.map((it, rowIdx) => {
              if (it.kind === "group") {
                const hasRollup =
                  page.groupRollup &&
                  it.u0 != null &&
                  it.u1 != null &&
                  it.u1 > it.u0;
                const leftPx = hasRollup ? it.u0! * colW : 0;
                const widthPx = hasRollup
                  ? Math.max(8, (it.u1! - it.u0!) * colW)
                  : 0;

                return (
                  <div
                    key={it.row.id}
                    className="flex items-center border-t border-[#E2E8E4] bg-[#F2F7F4] relative z-10"
                    style={{ height: page.rh }}
                  >
                    <div
                      className="shrink-0 flex items-center gap-1.5 px-2.5 font-extrabold text-[var(--brand-800)] truncate cursor-pointer"
                      style={{ width: page.lw }}
                      onClick={() => toggleGroupCollapse(it.row.id)}
                    >
                      <Icon
                        name={it.row.collapsed ? "chev-right" : "chev-down"}
                        size="xs"
                      />
                      <span className="truncate">{it.row.name}</span>
                    </div>
                    {page.showOwner && (
                      <div
                        className="shrink-0 border-l border-[#E2E8E4] h-full"
                        style={{ width: page.ow }}
                      />
                    )}
                    <div
                      className="shrink-0 border-l border-[#E2E8E4] h-full flex items-center justify-center text-[10px] font-bold text-[var(--muted)]"
                      style={{ width: page.dw }}
                    >
                      {it.n} {t("stats.tasks")}
                    </div>
                    <div
                      className="shrink-0 border-l border-[#E2E8E4] h-full flex items-center justify-center text-[10.5px] font-extrabold text-[var(--brand-700)]"
                      style={{ width: page.sw }}
                    >
                      {it.prog != null ? `${it.prog}%` : "—"}
                    </div>

                    <div
                      className="relative h-full shrink-0"
                      style={{ width: gridWidth }}
                    >
                      {hasRollup && (
                        <div
                          className="absolute top-1/2 -translate-y-1/2 h-[8px] rounded-full opacity-85"
                          style={{
                            left: leftPx,
                            width: widthPx,
                            background: page.accent,
                          }}
                        />
                      )}
                    </div>
                  </div>
                );
              }

              // Task Row
              const stColor = STATUS_META[it.st].color;
              const hasBar = it.u0 != null && it.u1 != null && it.bd;
              const dp =
                dragPreview && dragPreview.rowId === it.row.id
                  ? dragPreview
                  : null;
              const effU0 = hasBar ? it.u0! + (dp ? dp.duStart : 0) : 0;
              const effU1 = hasBar ? it.u1! + (dp ? dp.duEnd : 0) : 0;
              const barLeft = hasBar ? effU0 * colW : 0;
              const barWidth = hasBar
                ? Math.max(10, (effU1 - effU0) * colW)
                : 0;
              const isZebra = rowIdx % 2 === 1;

              return (
                <div
                  key={it.row.id}
                  className={`flex items-center border-t border-[#EEF2EF] relative z-10 ${
                    it.last
                      ? "bg-[#FFFBEB]"
                      : isZebra
                        ? "bg-[#FAFBF9]"
                        : "bg-white"
                  }`}
                  style={{ height: page.rh }}
                >
                  <div
                    className="shrink-0 flex items-center gap-1.5 px-3 truncate text-[var(--ink)] font-medium"
                    style={{ width: page.lw }}
                    title={it.row.name}
                  >
                    {it.ms && (
                      <span
                        className="text-[12px] leading-none shrink-0"
                        style={{ color: it.last ? "#E09200" : stColor }}
                      >
                        {it.last ? "★" : "◆"}
                      </span>
                    )}
                    <span className="truncate">{it.row.name}</span>
                  </div>

                  {page.showOwner && (
                    <div
                      className="shrink-0 border-l border-[#EEF2EF] h-full flex items-center px-2 text-[11px] text-[var(--ink-2)] truncate"
                      style={{ width: page.ow }}
                    >
                      {it.row.owner || "—"}
                    </div>
                  )}

                  <div
                    className="shrink-0 border-l border-[#EEF2EF] h-full flex items-center justify-center gap-1 px-1.5 text-[10.5px] text-[var(--ink-2)] truncate"
                    style={{ width: page.dw }}
                  >
                    <span>{it.bd ? formatRangeLabel(it.bd, lang) : "—"}</span>
                    {it.hk > 0 && (
                      <span className="font-bold text-[var(--muted)]">
                        ({it.hk} {lang === "en" ? "WD" : "HK"})
                      </span>
                    )}
                  </div>

                  <div
                    className="shrink-0 border-l border-[#EEF2EF] h-full flex items-center justify-center px-1.5"
                    style={{ width: page.sw }}
                  >
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{
                        background: `${stColor}1A`,
                        color: it.st === "notstarted" ? "#5A6961" : stColor,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: stColor }}
                      />
                      <span>{it.prog}%</span>
                    </span>
                  </div>

                  {/* Interactive Gantt Bar Cell */}
                  <div
                    className="relative h-full shrink-0"
                    style={{ width: gridWidth }}
                  >
                    {hasBar && (
                      <div
                        className={`group absolute top-1/2 -translate-y-1/2 h-[14px] rounded-full cursor-grab active:cursor-grabbing select-none touch-none ${
                          dp ? "ring-2 ring-[var(--accent)]/60" : ""
                        }`}
                        style={{
                          left: barLeft,
                          width: barWidth,
                          background: `${stColor}2E`,
                        }}
                        title={`${it.row.name} (${it.prog}%)`}
                        onPointerDown={(e) =>
                          startBarDrag(
                            e,
                            it.row.id,
                            "move",
                            it.bd!.sd,
                            it.bd!.ed,
                            it.u0!,
                            it.u1!
                          )
                        }
                      >
                        <div
                          className="h-full rounded-full pointer-events-none"
                          style={{
                            width: `${it.prog}%`,
                            background: stColor,
                          }}
                        />
                        {/* Left Resize Handle */}
                        <div
                          className="absolute -left-1.5 -top-1 -bottom-1 w-2.5 cursor-ew-resize opacity-0 group-hover:opacity-100 flex items-center justify-center"
                          onPointerDown={(e) =>
                            startBarDrag(
                              e,
                              it.row.id,
                              "left",
                              it.bd!.sd,
                              it.bd!.ed,
                              it.u0!,
                              it.u1!
                            )
                          }
                        >
                          <span className="w-1 h-3 rounded bg-white shadow border border-black/25" />
                        </div>
                        {/* Right Resize Handle */}
                        <div
                          className="absolute -right-1.5 -top-1 -bottom-1 w-2.5 cursor-ew-resize opacity-0 group-hover:opacity-100 flex items-center justify-center"
                          onPointerDown={(e) =>
                            startBarDrag(
                              e,
                              it.row.id,
                              "right",
                              it.bd!.sd,
                              it.bd!.ed,
                              it.u0!,
                              it.u1!
                            )
                          }
                        >
                          <span className="w-1 h-3 rounded bg-white shadow border border-black/25" />
                        </div>
                      </div>
                    )}
                    {hasBar && it.ms && (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 text-[14px] leading-none pointer-events-none"
                        style={{
                          left: barLeft + barWidth,
                          color: it.last ? "#E09200" : stColor,
                        }}
                      >
                        {it.last ? "★" : "◆"}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Milestone Rail */}
        {page.msRail && railMarks.length > 0 && (
          <div
            className="mt-2 relative border-t border-dashed border-[#C9D3CD] pt-4 pb-2"
            style={{
              marginLeft: fixedColsWidth,
              width: gridWidth,
              minHeight: 44,
            }}
          >
            {railMarks.map((m, idx) => (
              <div
                key={`${m.kind}-${idx}`}
                className="absolute top-0 -translate-x-1/2 flex flex-col items-center text-center"
                style={{ left: m.u * colW }}
              >
                <span
                  className="w-2.5 h-2.5 rotate-45 -mt-1.5 border border-white shadow-sm"
                  style={{
                    background:
                      m.kind === "now"
                        ? "#1F2A24"
                        : m.last
                          ? "#E09200"
                          : page.accent,
                  }}
                />
                <span className="text-[9.5px] font-extrabold text-[var(--ink)] whitespace-nowrap mt-1">
                  {m.date}
                </span>
                <span className="text-[9px] text-[var(--muted)] whitespace-nowrap max-w-[96px] truncate">
                  {m.name}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-2.5 text-[10.5px] text-[var(--muted)] font-medium">
          {lang === "en" ? "Current week" : "Minggu berjalan"}:{" "}
          {currentPeriodBadge}
        </div>
      </div>
    </div>
  );
}
