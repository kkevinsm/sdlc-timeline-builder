"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/IconSprite";
import { STATUS_META } from "@/constants/theme";
import {
  addDays,
  addHK,
  clamp,
  countHK,
  fmtD,
  fmtISO,
  formatRangeLabel,
  makeCalendarContext,
  monthName,
  nextWD,
  parseISO,
  prevWD,
  weekEnd,
  weekOf,
  weekStart,
} from "@/engine/calendar";
import { collectDepEdges, routeDepPath } from "@/engine/dependency";
import type { TaskItem, TimelineModel } from "@/engine/layoutModel";
import { statusFor } from "@/engine/status";
import { useTimeline } from "@/store/useTimelineStore";
import type { ColumnKey, DepType, DependencyRef, StatusKey } from "@/types/timeline";

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

interface HoveredBar {
  item: TaskItem;
  rect: { left: number; top: number; right: number; bottom: number; width: number };
}

export function TimelineCard({
  model,
  cardRef,
  scale,
  currentPeriodBadge,
}: TimelineCardProps) {
  const {
    lang,
    toggleGroupCollapse,
    updateActivePage,
    updateBarAndCascade,
    updateRow,
    deleteRow,
    duplicateRow,
    addTaskAfter,
    moveRow,
    reorderRow,
    remoteCursors,
    reportActiveRow,
    t,
  } = useTimeline();
  const { page, cols, monthGroups, colW, visibleRows, tu, railMarks } = model;
  const tableRef = useRef<HTMLDivElement>(null);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const [hoveredBar, setHoveredBar] = useState<HoveredBar | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [dragRowId, setDragRowId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dragColKey, setDragColKey] = useState<ColumnKey | null>(null);
  const [dropColKey, setDropColKey] = useState<ColumnKey | null>(null);
  const [colWidthPreview, setColWidthPreview] = useState<
    Partial<Record<ColumnKey, number>>
  >({});
  const [contextMenu, setContextMenu] = useState<{
    rowId: string;
    x: number;
    y: number;
  } | null>(null);

  const defaultColOrder: ColumnKey[] = ["task", "owner", "duration", "status"];
  const rawOrder =
    page.colOrder && page.colOrder.length === 4 ? page.colOrder : defaultColOrder;
  const visibleColOrder = rawOrder.filter(
    (k) => k !== "owner" || page.showOwner
  );

  const getColWidth = (key: ColumnKey): number => {
    if (colWidthPreview[key] != null) return colWidthPreview[key]!;
    if (key === "task") return page.lw;
    if (key === "owner") return page.ow;
    if (key === "duration") return page.dw;
    return page.sw;
  };

  const gridWidth = cols.length * colW;
  const fixedColsWidth = visibleColOrder.reduce(
    (sum, k) => sum + getColWidth(k),
    0
  );

  const startColResize = (
    e: React.PointerEvent<HTMLDivElement>,
    key: ColumnKey
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startW = getColWidth(key);
    const bounds: Record<ColumnKey, { min: number; max: number; field: "lw" | "ow" | "dw" | "sw" }> = {
      task: { min: 120, max: 420, field: "lw" },
      owner: { min: 70, max: 300, field: "ow" },
      duration: { min: 100, max: 320, field: "dw" },
      status: { min: 70, max: 360, field: "sw" },
    };
    const { min, max, field } = bounds[key];
    let latestW = startW;

    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / scale;
      latestW = Math.max(min, Math.min(max, Math.round(startW + dx)));
      setColWidthPreview((prev) => ({ ...prev, [key]: latestW }));
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setColWidthPreview((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      if (latestW !== startW) {
        updateActivePage({ [field]: latestW });
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const reorderColumns = (fromKey: ColumnKey, toKey: ColumnKey) => {
    if (fromKey === toKey) return;
    const next = [...rawOrder];
    const fromIdx = next.indexOf(fromKey);
    const toIdx = next.indexOf(toKey);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    updateActivePage({ colOrder: next });
  };

  // Close context menu on outside click, Escape, or scroll
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setContextMenu(null);
    };
    window.addEventListener("click", close);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
    };
  }, [contextMenu]);

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
    const startY = e.clientY;
    let moved = false;
    const avgDaysPerCol =
      cols.length > 0
        ? cols.reduce((s, c) => s + c.days, 0) / cols.length
        : 7;

    const computeDeltaDays = (clientX: number) => {
      const dx = (clientX - startX) / (colW * scale);
      return Math.round(dx * avgDaysPerCol);
    };

    const onMove = (ev: PointerEvent) => {
      if (
        !moved &&
        (Math.abs(ev.clientX - startX) >= 4 ||
          Math.abs(ev.clientY - startY) >= 4)
      ) {
        moved = true;
        setHoveredBar(null);
      }
      if (!moved) return;
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

      if (!moved && mode === "move") {
        setEditingTaskId(rowId);
        return;
      }

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

  const commitNameEdit = (id: string) => {
    const trimmed = nameDraft.trim();
    if (trimmed) {
      updateRow(id, { name: trimmed });
    }
    setEditingNameId(null);
  };

  const editingTaskRow = editingTaskId
    ? page.rows.find((r) => r.id === editingTaskId && r.type === "task")
    : null;
  const editingTaskItem = editingTaskId
    ? model.tasks.find((tk) => tk.row.id === editingTaskId)
    : null;
  const editingGroupRow = editingGroupId
    ? page.rows.find((r) => r.id === editingGroupId && r.type === "group")
    : null;
  const editingGroupItem = editingGroupId
    ? model.items.find(
        (it) => it.kind === "group" && it.row.id === editingGroupId
      )
    : null;

  const formatGroupAutoDuration = (
    kids: TaskItem[],
    sd?: Date,
    ed?: Date
  ): string => {
    const totalHk = kids.reduce((s, k) => s + k.hk, 0);
    if (!sd || !ed || totalHk === 0) return "";
    const unit = lang === "en" ? "WD" : "HK";
    const sw = weekOf(sd);
    const ew = weekOf(ed);
    const sm = monthName(sd.getMonth(), lang, true);
    const em = monthName(ed.getMonth(), lang, true);
    const sy = sd.getFullYear();
    const ey = ed.getFullYear();
    let range = "";
    if (sy === ey) {
      range =
        sm === em && sw === ew
          ? `W${sw} ${sm} ${sy}`
          : sm === em
            ? `W${sw}–W${ew} ${sm} ${sy}`
            : `W${sw} ${sm} – W${ew} ${em} ${sy}`;
    } else {
      range = `W${sw} ${sm} ${sy} – W${ew} ${em} ${ey}`;
    }
    return `${totalHk} ${unit} (${range})`;
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
          zoom: scale,
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
              style={{ backgroundColor: page.tgtc || "#1B7A3E" }}
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
          <div
            className={`flex items-center flex-wrap gap-x-4 gap-y-1.5 ${
              page.rows.length > 0 ? "sticky left-[22px] z-20 bg-white pr-3" : ""
            }`}
          >
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
          </div>
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
          ref={tableRef}
          className="border border-[#D8E0DB] rounded-[10px] overflow-clip bg-white relative"
          style={{ width: fixedColsWidth + gridWidth }}
        >
          {/* Sticky Header Row */}
          <div className="flex border-b border-[#D8E0DB]">
            <div
              className={`${page.rows.length > 0 ? "sticky left-0 z-40" : "relative"} flex shrink-0 border-r border-white/20 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.08)]`}
              style={{
                width: fixedColsWidth,
                background: page.accent,
              }}
            >
              {visibleColOrder.map((colKey, idx) => {
                const w = getColWidth(colKey);
                const label =
                  colKey === "task"
                    ? "TASK"
                    : colKey === "owner"
                      ? "PIC"
                      : colKey === "duration"
                        ? lang === "en"
                          ? "DURATION"
                          : "DURASI"
                        : "STATUS";
                const isDrop = dropColKey === colKey && dragColKey !== colKey;
                return (
                  <div
                    key={colKey}
                    draggable
                    onDragStart={(e) => {
                      setDragColKey(colKey);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(e) => {
                      if (!dragColKey || dragColKey === colKey) return;
                      e.preventDefault();
                      setDropColKey(colKey);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragColKey && dragColKey !== colKey) {
                        reorderColumns(dragColKey, colKey);
                      }
                      setDragColKey(null);
                      setDropColKey(null);
                    }}
                    onDragEnd={() => {
                      setDragColKey(null);
                      setDropColKey(null);
                    }}
                    className={`relative shrink-0 flex items-center font-extrabold text-[10px] uppercase tracking-wider text-white cursor-grab active:cursor-grabbing select-none ${
                      colKey === "task" ? "px-3" : "justify-center"
                    } ${idx > 0 ? "border-l border-white/20" : ""} ${
                      isDrop ? "bg-white/20" : ""
                    }`}
                    style={{ width: w }}
                    title={
                      lang === "en"
                        ? "Drag header to move column · drag right edge to resize"
                        : "Seret header untuk pindah kolom · seret tepi kanan untuk ubah lebar"
                    }
                  >
                    <span className="truncate">{label}</span>
                    <div
                      onPointerDown={(e) => startColResize(e, colKey)}
                      onDragStart={(e) => e.preventDefault()}
                      className="absolute top-0 bottom-0 -right-1 w-2 cursor-col-resize z-10 hover:bg-white/40 transition-colors"
                    />
                  </div>
                );
              })}
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
                {cols.map((col, ci) => {
                  const refDate = model.td;
                  const isCurrentCol = Boolean(
                    page.showToday &&
                      tu != null &&
                      ((refDate &&
                        col.kind === "day" &&
                        col.month === monthName(refDate.getMonth(), "id") &&
                        col.year === refDate.getFullYear() &&
                        col.week === weekOf(refDate)) ||
                        (refDate &&
                          col.kind !== "day" &&
                          refDate >= col.ds &&
                          refDate <= col.de) ||
                        (!refDate &&
                          col.month === page.cm &&
                          col.year === page.cy &&
                          col.week === page.cw))
                  );
                  return (
                    <div
                      key={`${col.month}-${col.year}-${col.label}-${ci}`}
                      className={`text-center text-[10px] font-bold py-1 border-l shrink-0 whitespace-nowrap overflow-hidden flex flex-col items-center justify-center leading-tight ${
                        isCurrentCol
                          ? "bg-[#1F2A24] text-white border-[#2E3B34]"
                          : col.hasHoliday
                            ? "bg-[#FEF2F2] text-[#C62828] border-[#E2E8E4]"
                            : col.off
                              ? "bg-[#F1F5F2] text-[var(--muted)] border-[#E2E8E4]"
                              : "text-[var(--ink-2)] border-[#E2E8E4]"
                      }`}
                      style={{ width: colW }}
                      title={col.holidayNames?.join(", ")}
                    >
                      {col.subLabel && (
                        <span
                          className={`text-[8.5px] font-semibold leading-none mb-0.5 ${
                            isCurrentCol ? "opacity-90" : "opacity-75"
                          }`}
                        >
                          {col.subLabel}
                        </span>
                      )}
                      <span>{col.label}</span>
                    </div>
                  );
                })}
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
                  className="absolute top-0 bottom-0 z-[6] pointer-events-none"
                  style={{ left: tu * colW }}
                >
                  <span className="absolute -top-1 -left-[3.5px] w-2 h-2 rounded-full bg-[#1F2A24]" />
                  <div className="h-full w-[2px] border-l-2 border-dashed border-[#1F2A24]/80" />
                  <span className="absolute -bottom-1 -left-[3.5px] w-2 h-2 rounded-full bg-[#1F2A24]" />
                  {!page.msRail && (
                    <div className="absolute top-full mt-2 -translate-x-1/2 flex flex-col items-center text-center whitespace-nowrap">
                      <span className="text-[10px] font-extrabold text-[var(--ink)] leading-tight">
                        {model.tuKind === "today" && model.td
                          ? fmtD(model.td, lang)
                          : currentPeriodBadge}
                      </span>
                      <span className="text-[9.5px] font-medium text-[var(--muted)] leading-tight">
                        {model.tuKind === "today"
                          ? t("core.today")
                          : lang === "en"
                            ? "This week"
                            : "Minggu ini"}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dependency SVG Overlay */}
            {page.showDeps && depEdges.length > 0 && (
              <svg
                className="absolute top-0 bottom-0 pointer-events-none z-[5]"
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
                    className={`${page.rows.length > 0 ? "sticky left-0 z-30" : "relative"} shrink-0 border-r border-[var(--line-2)] bg-white`}
                    style={{
                      width: fixedColsWidth,
                    }}
                  />
                </div>
              ))}

            {/* Actual Data Rows */}
            {visibleRows.map((it, rowIdx) => {
              const isDropTarget =
                dropTargetId === it.row.id && dragRowId !== it.row.id;

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
                    className={`flex items-center border-t border-[#E2E8E4] bg-[#F2F7F4] relative ${
                      isDropTarget ? "ring-2 ring-inset ring-[var(--brand)]" : ""
                    }`}
                    style={{ height: page.rh }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({
                        rowId: it.row.id,
                        x: e.clientX,
                        y: e.clientY,
                      });
                    }}
                    onDragOver={(e) => {
                      if (!dragRowId || dragRowId === it.row.id) return;
                      e.preventDefault();
                      setDropTargetId(it.row.id);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragRowId && dragRowId !== it.row.id) {
                        reorderRow(dragRowId, it.row.id);
                      }
                      setDragRowId(null);
                      setDropTargetId(null);
                    }}
                  >
                    <div
                      className="sticky left-0 z-30 flex items-center h-full shrink-0 bg-[#F2F7F4] border-r border-[#D8E0DB] shadow-[2px_0_6px_-2px_rgba(0,0,0,0.06)]"
                      style={{
                        width: fixedColsWidth,
                      }}
                    >
                      {visibleColOrder.map((colKey, idx) => {
                        const w = getColWidth(colKey);
                        const borderCls = idx > 0 ? "border-l border-[#E2E8E4]" : "";
                        if (colKey === "task") {
                          return (
                            <div
                              key={colKey}
                              className={`group/row shrink-0 flex items-center gap-1 px-2 font-extrabold text-[var(--brand-800)] truncate h-full ${borderCls}`}
                              style={{ width: w }}
                            >
                              <span
                                draggable
                                onDragStart={(e) => {
                                  setDragRowId(it.row.id);
                                  e.dataTransfer.effectAllowed = "move";
                                }}
                                onDragEnd={() => {
                                  setDragRowId(null);
                                  setDropTargetId(null);
                                }}
                                className="cursor-grab active:cursor-grabbing text-[var(--muted-2)] hover:text-[var(--ink-2)] px-0.5 select-none text-[11px] leading-none shrink-0"
                                title={lang === "en" ? "Drag to reorder" : "Seret untuk memindahkan"}
                              >
                                ⋮⋮
                              </span>
                              <button
                                type="button"
                                className="shrink-0 p-0.5 rounded hover:bg-black/5"
                                onClick={() => toggleGroupCollapse(it.row.id)}
                                aria-label="Toggle group"
                              >
                                <Icon
                                  name={it.row.collapsed ? "chev-right" : "chev-down"}
                                  size="xs"
                                />
                              </button>
                              {editingNameId === it.row.id ? (
                                <input
                                  type="text"
                                  autoFocus
                                  value={nameDraft}
                                  onChange={(e) => setNameDraft(e.target.value)}
                                  onBlur={() => commitNameEdit(it.row.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") commitNameEdit(it.row.id);
                                    if (e.key === "Escape") setEditingNameId(null);
                                  }}
                                  className="flex-1 min-w-0 bg-white border border-[var(--brand)] rounded px-1 py-0.5 text-[11px] font-bold text-[var(--brand-800)] outline-none"
                                />
                              ) : (
                                <span
                                  className="truncate flex-1 cursor-pointer flex items-baseline gap-1.5 min-w-0"
                                  title={
                                    lang === "en"
                                      ? "Double-click to rename"
                                      : "Klik 2x untuk ubah nama"
                                  }
                                  onDoubleClick={() => {
                                    setEditingNameId(it.row.id);
                                    setNameDraft(it.row.name);
                                  }}
                                  onClick={() => toggleGroupCollapse(it.row.id)}
                                >
                                  <span className="truncate">{it.row.name}</span>
                                  {(() => {
                                    const grpDur =
                                      it.row.durationLabel ||
                                      formatGroupAutoDuration(it.kids, it.sd, it.ed);
                                    return grpDur ? (
                                      <span className="text-[10px] font-medium text-[var(--muted)] truncate shrink">
                                        {grpDur}
                                      </span>
                                    ) : null;
                                  })()}
                                </span>
                              )}
                            </div>
                          );
                        }
                        if (colKey === "owner") {
                          return (
                            <div
                              key={colKey}
                              className={`shrink-0 h-full ${borderCls}`}
                              style={{ width: w }}
                            />
                          );
                        }
                        if (colKey === "duration") {
                          return (
                            <div
                              key={colKey}
                              className={`shrink-0 h-full flex items-center justify-center text-[10px] font-bold text-[var(--muted)] ${borderCls}`}
                              style={{ width: w }}
                            >
                              {it.n} {t("stats.tasks")}
                            </div>
                          );
                        }
                        return (
                          <div
                            key={colKey}
                            className={`shrink-0 h-full flex items-center justify-center text-[10.5px] font-extrabold text-[var(--brand-700)] ${borderCls}`}
                            style={{ width: w }}
                          >
                            {it.prog != null ? `${it.prog}%` : "—"}
                          </div>
                        );
                      })}
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
              const rowBg = it.last
                ? "bg-[#FFFBEB]"
                : isZebra
                  ? "bg-[#FAFBF9]"
                  : "bg-white";

              const rowEditors = Object.values(remoteCursors).filter(
                (c) => c.pageId === page.id && c.rowId === it.row.id
              );

              return (
                <div
                  key={it.row.id}
                  className={`flex items-center border-t border-[#EEF2EF] relative ${rowBg} ${
                    isDropTarget ? "ring-2 ring-inset ring-[var(--brand)]" : ""
                  }`}
                  style={{
                    height: page.rh,
                    boxShadow: rowEditors.length
                      ? `inset 3px 0 0 ${rowEditors[0].color}`
                      : undefined,
                  }}
                  onClick={() => reportActiveRow(it.row.id)}
                  onFocusCapture={() => reportActiveRow(it.row.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({
                      rowId: it.row.id,
                      x: e.clientX,
                      y: e.clientY,
                    });
                  }}
                  onDragOver={(e) => {
                    if (!dragRowId || dragRowId === it.row.id) return;
                    e.preventDefault();
                    setDropTargetId(it.row.id);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragRowId && dragRowId !== it.row.id) {
                      reorderRow(dragRowId, it.row.id);
                    }
                    setDragRowId(null);
                    setDropTargetId(null);
                  }}
                >
                  <div
                    className={`sticky left-0 z-30 flex items-center h-full shrink-0 border-r border-[#D8E0DB] shadow-[2px_0_6px_-2px_rgba(0,0,0,0.06)] ${rowBg}`}
                    style={{
                      width: fixedColsWidth,
                    }}
                  >
                    {visibleColOrder.map((colKey, idx) => {
                      const w = getColWidth(colKey);
                      const borderCls = idx > 0 ? "border-l border-[#EEF2EF]" : "";
                      if (colKey === "task") {
                        return (
                          <div
                            key={colKey}
                            className={`shrink-0 flex items-center gap-1 px-2 truncate text-[var(--ink)] font-medium h-full ${borderCls}`}
                            style={{ width: w }}
                            title={it.row.name}
                          >
                            <span
                              draggable
                              onDragStart={(e) => {
                                setDragRowId(it.row.id);
                                e.dataTransfer.effectAllowed = "move";
                              }}
                              onDragEnd={() => {
                                setDragRowId(null);
                                setDropTargetId(null);
                              }}
                              className="cursor-grab active:cursor-grabbing text-[var(--muted-2)] hover:text-[var(--ink-2)] px-0.5 select-none text-[11px] leading-none shrink-0"
                              title={lang === "en" ? "Drag to reorder" : "Seret untuk memindahkan"}
                            >
                              ⋮⋮
                            </span>
                            {it.ms && (
                              <span
                                className="text-[12px] leading-none shrink-0"
                                style={{ color: it.last ? "#E09200" : stColor }}
                              >
                                {it.last ? "★" : "◆"}
                              </span>
                            )}
                            {editingNameId === it.row.id ? (
                              <input
                                type="text"
                                autoFocus
                                value={nameDraft}
                                onChange={(e) => setNameDraft(e.target.value)}
                                onBlur={() => commitNameEdit(it.row.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") commitNameEdit(it.row.id);
                                  if (e.key === "Escape") setEditingNameId(null);
                                }}
                                className="flex-1 min-w-0 bg-white border border-[var(--brand)] rounded px-1 py-0.5 text-[11px] font-medium text-[var(--ink)] outline-none"
                              />
                            ) : (
                              <span
                                className="truncate flex-1 cursor-text hover:underline decoration-dotted"
                                onClick={() => {
                                  setEditingNameId(it.row.id);
                                  setNameDraft(it.row.name);
                                }}
                              >
                                {it.row.name}
                              </span>
                            )}
                            {rowEditors.slice(0, 2).map((ed) => (
                              <span
                                key={ed.userId}
                                className="px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white shrink-0 leading-none"
                                style={{ backgroundColor: ed.color }}
                                title={`${ed.name}`}
                              >
                                {ed.name.split(" ")[0]}
                              </span>
                            ))}
                          </div>
                        );
                      }
                      if (colKey === "owner") {
                        return (
                          <div
                            key={colKey}
                            className={`shrink-0 h-full flex items-center px-2 text-[11px] text-[var(--ink-2)] truncate ${borderCls}`}
                            style={{ width: w }}
                          >
                            {it.row.owner || "—"}
                          </div>
                        );
                      }
                      if (colKey === "duration") {
                        return (
                          <div
                            key={colKey}
                            className={`shrink-0 h-full flex items-center justify-center gap-1 px-1.5 text-[10.5px] text-[var(--ink-2)] truncate ${borderCls}`}
                            style={{ width: w }}
                          >
                            {it.row.bar?.durationLabel ? (
                              <span className="truncate">{it.row.bar.durationLabel}</span>
                            ) : (
                              <>
                                <span>{it.bd ? formatRangeLabel(it.bd, lang) : "—"}</span>
                                {it.hk > 0 && (
                                  <span className="font-bold text-[var(--muted)]">
                                    ({it.hk} {lang === "en" ? "WD" : "HK"})
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        );
                      }
                      return (
                        <div
                          key={colKey}
                          className={`shrink-0 h-full flex items-center justify-center px-1.5 ${borderCls}`}
                          style={{ width: w }}
                        >
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold truncate max-w-full"
                            style={{
                              background: `${stColor}1A`,
                              color: it.st === "notstarted" ? "#5A6961" : stColor,
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ background: stColor }}
                            />
                            <span className="truncate">
                              {it.row.bar?.progressText || `${it.prog}%`}
                              {it.row.bar?.statusText ? ` ${it.row.bar.statusText}` : ""}
                            </span>
                          </span>
                        </div>
                      );
                    })}
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
                        onPointerEnter={(e) => {
                          if (!dragPreview) {
                            const r = e.currentTarget.getBoundingClientRect();
                            setHoveredBar({
                              item: it,
                              rect: {
                                left: r.left,
                                top: r.top,
                                right: r.right,
                                bottom: r.bottom,
                                width: r.width,
                              },
                            });
                          }
                        }}
                        onPointerLeave={() => {
                          setHoveredBar((cur) =>
                            cur?.item.row.id === it.row.id ? null : cur
                          );
                        }}
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

            {/* Hover Tooltip for Timeline Bar (Always On Top via Portal) */}
            {hoveredBar &&
              !dragPreview &&
              hoveredBar.item.bd &&
              typeof document !== "undefined" &&
              (() => {
                const { item, rect } = hoveredBar;
                const bd = item.bd!;
                const stColor = STATUS_META[item.st].color;
                const sameDay =
                  bd.sd.getFullYear() === bd.ed.getFullYear() &&
                  bd.sd.getMonth() === bd.ed.getMonth() &&
                  bd.sd.getDate() === bd.ed.getDate();
                const datesStr = sameDay
                  ? fmtD(bd.sd, lang)
                  : `${fmtD(bd.sd, lang)} – ${fmtD(bd.ed, lang)}`;
                const preds = (item.row.deps || []).map((d) => {
                  const predRow = page.rows.find((r) => r.id === d.id);
                  return `[${d.type}] ${predRow?.name || d.id}`;
                });

                const tooltipW = 300;
                const centerLeft = Math.min(
                  Math.max(tooltipW / 2 + 12, rect.left + rect.width / 2),
                  window.innerWidth - tooltipW / 2 - 12
                );
                const showBelow = rect.top < 250;
                const topPx = showBelow ? rect.bottom + 10 : rect.top - 10;

                return createPortal(
                  <div
                    className={`pointer-events-none fixed z-[200] w-[300px] rounded-xl border border-white/10 bg-[#131A16]/95 p-3.5 text-[11.5px] text-white shadow-2xl backdrop-blur-sm -translate-x-1/2 ${
                      showBelow ? "" : "-translate-y-full"
                    }`}
                    style={{
                      left: centerLeft,
                      top: topPx,
                    }}
                  >
                    {/* Header with status dot & task name */}
                    <div className="flex items-center gap-2 mb-2.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: stColor }}
                      />
                      <span className="font-bold text-[13px] text-white truncate">
                        {item.row.name}
                      </span>
                    </div>

                    {/* Details rows */}
                    <div className="flex flex-col gap-1 text-[11.5px]">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[#9AA8A0]">Period</span>
                        <span className="font-bold text-white text-right">
                          {formatRangeLabel(bd, lang) || "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[#9AA8A0]">Dates</span>
                        <span className="font-bold text-white text-right">
                          {datesStr}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[#9AA8A0]">Duration</span>
                        <span className="font-bold text-white text-right">
                          {item.hk} {lang === "en" ? "WD" : "HK"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[#9AA8A0]">Status</span>
                        <span className="font-bold text-white text-right">
                          {t(`st.${item.st}.label`)}
                        </span>
                      </div>
                      {preds.length > 0 && (
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-[#9AA8A0] shrink-0">Predecessor</span>
                          <span className="font-bold text-white text-right break-words">
                            {preds.join(", ")}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Full-width Progress Bar */}
                    <div className="mt-2.5 mb-1.5 h-1.5 w-full rounded-full bg-white/15 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${item.prog}%`,
                          background: stColor,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11.5px]">
                      <span className="text-[#9AA8A0]">Progress</span>
                      <span className="font-bold text-white">
                        {item.row.bar?.progressText || `${item.prog}%`}
                      </span>
                    </div>

                    {/* Footer Hint */}
                    <div className="mt-2.5 pt-2 border-t border-white/10 text-[10.5px] text-[#8E9B94] leading-snug">
                      {lang === "en"
                        ? "Drag to move · pull the ends to change duration · tap/click to edit"
                        : "Geser untuk pindah · tarik ujung untuk ubah durasi · klik untuk edit"}
                    </div>
                  </div>,
                  document.body
                );
              })()}
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

        <div
          className={`text-[10.5px] text-[var(--muted)] font-medium ${
            page.showToday && tu != null && !page.msRail ? "mt-10" : "mt-2.5"
          }`}
        >
          {lang === "en" ? "Current week" : "Minggu berjalan"}:{" "}
          {currentPeriodBadge}
        </div>
      </div>

      {/* Row Right-Click Context Menu */}
      {contextMenu &&
        typeof document !== "undefined" &&
        (() => {
          const ctxRow = page.rows.find((r) => r.id === contextMenu.rowId);
          if (!ctxRow) return null;
          const ctxTaskItem =
            ctxRow.type === "task"
              ? model.tasks.find((tk) => tk.row.id === ctxRow.id)
              : null;
          const menuW = 236;
          const menuH = ctxRow.type === "task" ? 410 : 210;
          const left = Math.min(
            contextMenu.x,
            Math.max(8, window.innerWidth - menuW - 8)
          );
          const top = Math.min(
            contextMenu.y,
            Math.max(8, window.innerHeight - menuH - 8)
          );

          return createPortal(
            <div
              className="fixed z-[120] w-[236px] rounded-xl border border-[#DCE4DF] bg-white py-1.5 shadow-2xl text-[12.5px] text-[var(--ink)] select-none"
              style={{ left, top }}
              onClick={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.preventDefault()}
            >
              <button
                type="button"
                className="w-full flex items-center justify-between px-3.5 py-2 hover:bg-[#F3F6F4] text-left font-medium"
                onClick={() => {
                  if (ctxRow.type === "task") {
                    setEditingTaskId(ctxRow.id);
                  } else {
                    setEditingGroupId(ctxRow.id);
                  }
                  setContextMenu(null);
                }}
              >
                <span className="flex items-center gap-2.5">
                  <Icon name="edit" size="sm" className="text-[var(--muted)]" />
                  <span>Edit...</span>
                </span>
                <span className="text-[11px] text-[var(--muted)]">Enter</span>
              </button>

              <button
                type="button"
                className="w-full flex items-center justify-between px-3.5 py-2 hover:bg-[#F3F6F4] text-left font-medium"
                onClick={() => {
                  duplicateRow(ctxRow.id);
                  setContextMenu(null);
                }}
              >
                <span className="flex items-center gap-2.5">
                  <Icon name="copy" size="sm" className="text-[var(--muted)]" />
                  <span>{lang === "en" ? "Duplicate" : "Duplikat"}</span>
                </span>
                <span className="text-[11px] text-[var(--muted)]">Ctrl+D</span>
              </button>

              <button
                type="button"
                className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-[#F3F6F4] text-left font-medium"
                onClick={() => {
                  addTaskAfter(ctxRow.id);
                  setContextMenu(null);
                }}
              >
                <Icon name="dep" size="sm" className="text-[var(--muted)]" />
                <span>{lang === "en" ? "Add task below" : "Tambah task di bawah"}</span>
              </button>

              {ctxRow.type === "task" && ctxRow.bar && (
                <>
                  <div className="my-1 border-t border-[#EEF2EF]" />
                  <div className="px-3.5 py-1 text-[10px] font-extrabold tracking-wider uppercase text-[var(--muted)]">
                    SET STATUS
                  </div>
                  {(
                    ["done", "inprogress", "atrisk", "notstarted"] as const
                  ).map((st) => {
                    const active = (ctxTaskItem?.st || ctxRow.bar!.status) === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        className="w-full flex items-center justify-between px-3.5 py-1.5 hover:bg-[#F3F6F4] text-left font-medium"
                        onClick={() => {
                          updateRow(ctxRow.id, {
                            bar: {
                              ...ctxRow.bar!,
                              status: st,
                              statusLocked: true,
                            },
                          });
                          setContextMenu(null);
                        }}
                      >
                        <span className="flex items-center gap-2.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ background: STATUS_META[st].color }}
                          />
                          <span>{t(`st.${st}.label`)}</span>
                        </span>
                        {active && (
                          <Icon name="check" size="xs" className="text-[var(--ink-2)]" />
                        )}
                      </button>
                    );
                  })}

                  <div className="my-1 border-t border-[#EEF2EF]" />
                  <button
                    type="button"
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-[#F3F6F4] text-left font-medium"
                    onClick={() => {
                      updateRow(ctxRow.id, {
                        bar: { ...ctxRow.bar!, ms: !ctxRow.bar!.ms },
                      });
                      setContextMenu(null);
                    }}
                  >
                    <Icon
                      name="star"
                      size="sm"
                      className={ctxRow.bar.ms ? "text-[#E09200]" : "text-[var(--muted)]"}
                    />
                    <span>
                      {ctxRow.bar.ms
                        ? lang === "en"
                          ? "Remove milestone"
                          : "Hapus milestone"
                        : lang === "en"
                          ? "Make milestone"
                          : "Jadikan milestone"}
                    </span>
                  </button>
                </>
              )}

              <div className="my-1 border-t border-[#EEF2EF]" />
              <button
                type="button"
                className="w-full flex items-center justify-between px-3.5 py-2 hover:bg-[#F3F6F4] text-left font-medium"
                onClick={() => {
                  moveRow(ctxRow.id, -1);
                  setContextMenu(null);
                }}
              >
                <span className="flex items-center gap-2.5">
                  <Icon name="up" size="sm" className="text-[var(--muted)]" />
                  <span>{lang === "en" ? "Move up" : "Pindah ke atas"}</span>
                </span>
                <span className="text-[11px] text-[var(--muted)]">Alt+↑</span>
              </button>

              <button
                type="button"
                className="w-full flex items-center justify-between px-3.5 py-2 hover:bg-[#F3F6F4] text-left font-medium"
                onClick={() => {
                  moveRow(ctxRow.id, 1);
                  setContextMenu(null);
                }}
              >
                <span className="flex items-center gap-2.5">
                  <Icon name="down" size="sm" className="text-[var(--muted)]" />
                  <span>{lang === "en" ? "Move down" : "Pindah ke bawah"}</span>
                </span>
                <span className="text-[11px] text-[var(--muted)]">Alt+↓</span>
              </button>

              <div className="my-1 border-t border-[#EEF2EF]" />
              <button
                type="button"
                className="w-full flex items-center justify-between px-3.5 py-2 hover:bg-[#FEF2F2] text-left font-medium text-[#E53935]"
                onClick={() => {
                  deleteRow(ctxRow.id);
                  setContextMenu(null);
                }}
              >
                <span className="flex items-center gap-2.5">
                  <Icon name="trash" size="sm" />
                  <span>{lang === "en" ? "Delete" : "Hapus"}</span>
                </span>
                <span className="text-[11px] opacity-75">Del</span>
              </button>
            </div>,
            document.body
          );
        })()}

      {/* Edit Group Modal */}
      {editingGroupRow &&
        typeof document !== "undefined" &&
        createPortal(
          <GroupEditModal
            key={editingGroupRow.id}
            row={editingGroupRow}
            autoLabel={
              editingGroupItem && editingGroupItem.kind === "group"
                ? formatGroupAutoDuration(
                    editingGroupItem.kids,
                    editingGroupItem.sd,
                    editingGroupItem.ed
                  )
                : ""
            }
            lang={lang}
            onClose={() => setEditingGroupId(null)}
            onDelete={() => {
              deleteRow(editingGroupRow.id);
              setEditingGroupId(null);
            }}
            onSave={(patch) => {
              updateRow(editingGroupRow.id, patch);
              setEditingGroupId(null);
            }}
          />,
          document.body
        )}

      {/* Tap Bar Task Editor Modal */}
      {editingTaskRow &&
        editingTaskRow.bar &&
        typeof document !== "undefined" &&
        createPortal(
          <TaskEditModal
            key={editingTaskRow.id}
            row={editingTaskRow}
            taskItem={editingTaskItem || null}
            page={page}
            lang={lang}
            t={t}
            onClose={() => setEditingTaskId(null)}
            onDelete={() => {
              deleteRow(editingTaskRow.id);
              setEditingTaskId(null);
            }}
            onSave={(rowPatch, barPatch, nextDeps) => {
              updateRow(editingTaskRow.id, {
                ...rowPatch,
                deps: nextDeps,
              });
              updateBarAndCascade(editingTaskRow.id, barPatch);
              setEditingTaskId(null);
            }}
          />,
          document.body
        )}
    </div>
  );
}

function GroupEditModal({
  row,
  autoLabel,
  lang,
  onClose,
  onDelete,
  onSave,
}: {
  row: TimelineModel["page"]["rows"][number];
  autoLabel: string;
  lang: "id" | "en";
  onClose: () => void;
  onDelete: () => void;
  onSave: (patch: {
    name: string;
    durationLabel?: string;
    collapsed: boolean;
  }) => void;
}) {
  const [name, setName] = useState(row.name);
  const [durationLabel, setDurationLabel] = useState(row.durationLabel || "");
  const [collapsed, setCollapsed] = useState(Boolean(row.collapsed));

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[540px] rounded-2xl border border-[var(--line)] bg-white shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--line-2)]">
          <div className="w-9 h-9 rounded-xl bg-[var(--brand-50)] text-[var(--brand)] flex items-center justify-center shrink-0">
            <Icon name="group" size="sm" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-extrabold text-[var(--ink)] leading-tight">
              {lang === "en" ? "Edit group" : "Edit group"}
            </h3>
            <p className="text-[11.5px] text-[var(--muted)] truncate">
              {row.name}
            </p>
          </div>
          <button
            type="button"
            className="ibtn sm"
            onClick={onClose}
            aria-label="Close"
          >
            <Icon name="x" size="sm" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-3.5">
          <div className="fg">
            <label>{lang === "en" ? "GROUP NAME" : "NAMA GROUP"}</label>
            <input
              type="text"
              autoFocus
              className="inp"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="fg">
            <label>
              {lang === "en" ? "DURATION LABEL" : "LABEL DURASI"}{" "}
              <span className="kv lowercase font-medium">
                {lang === "en"
                  ? "(empty = automatic from tasks)"
                  : "(kosong = otomatis dari task)"}
              </span>
            </label>
            <input
              type="text"
              className="inp"
              value={durationLabel}
              placeholder={autoLabel || "e.g. 13 WD (W5 Nov – W3 Dec 2026)"}
              onChange={(e) => setDurationLabel(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-3 pt-1 cursor-pointer">
            <span className="tgl">
              <input
                type="checkbox"
                checked={collapsed}
                onChange={(e) => setCollapsed(e.target.checked)}
              />
              <span className="tk" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-bold text-[12.5px] text-[var(--ink)]">
                {lang === "en" ? "Collapse group" : "Ciutkan group"}
              </span>
              <span className="block text-[11px] text-[var(--muted)]">
                {lang === "en"
                  ? "Hide the tasks inside — the timeline only shows the group's compact bar"
                  : "Sembunyikan task di dalamnya — timeline hanya menampilkan bar ringkas group"}
              </span>
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--line-2)] bg-white">
          <button
            type="button"
            className="btn text-[#E53935] border-[#FECACA] hover:bg-[#FEF2F2]"
            onClick={onDelete}
          >
            <Icon name="trash" size="sm" />
            <span>{lang === "en" ? "Delete" : "Hapus"}</span>
          </button>
          <div className="flex items-center gap-2">
            <button type="button" className="btn" onClick={onClose}>
              {lang === "en" ? "Cancel" : "Batal"}
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() =>
                onSave({
                  name: name.trim() || row.name,
                  durationLabel: durationLabel.trim() || undefined,
                  collapsed,
                })
              }
            >
              <Icon name="check" size="sm" />
              <span>{lang === "en" ? "Save" : "Simpan"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TaskEditModalProps {
  row: TimelineModel["page"]["rows"][number];
  taskItem: TaskItem | null;
  page: TimelineModel["page"];
  lang: "id" | "en";
  t: (key: Parameters<ReturnType<typeof useTimeline>["t"]>[0]) => string;
  onClose: () => void;
  onDelete: () => void;
  onSave: (
    rowPatch: { name: string; owner: string },
    barPatch: Partial<NonNullable<TimelineModel["page"]["rows"][number]["bar"]>>,
    deps: DependencyRef[]
  ) => void;
}

const WEEKDAY_SHORT_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_SHORT_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function subHK(
  ctx: ReturnType<typeof makeCalendarContext>,
  endDate: Date,
  hk: number
): Date {
  const target = clamp(hk, 1, 3000);
  let c = new Date(endDate);
  let n = ctx.wdSet.has(c.getDay()) && !ctx.holMap.has(fmtISO(c)) ? 1 : 0;
  while (n < target) {
    c = addDays(c, -1);
    if (ctx.wdSet.has(c.getDay()) && !ctx.holMap.has(fmtISO(c))) n++;
  }
  return c;
}

function TaskEditModal({
  row,
  taskItem,
  page,
  lang,
  t,
  onClose,
  onDelete,
  onSave,
}: TaskEditModalProps) {
  const bar = row.bar!;
  const ctx = useMemo(() => makeCalendarContext(page), [page]);

  const initialExact = Boolean(bar.sd || page.dateMode === "day");
  const initialSd =
    bar.sd ||
    (taskItem?.bd ? fmtISO(taskItem.bd.sd) : fmtISO(weekStart(bar.startMonth || page.cm, bar.startYear || page.year, bar.startWeek || 1)));
  const initialEd =
    bar.ed ||
    (taskItem?.bd ? fmtISO(taskItem.bd.ed) : fmtISO(weekEnd(bar.endMonth || bar.startMonth || page.cm, bar.endYear || bar.startYear || page.year, bar.endWeek || bar.startWeek || 1)));

  const [name, setName] = useState(row.name);
  const [owner, setOwner] = useState(row.owner || "");
  const [ms, setMs] = useState(Boolean(bar.ms));
  const [schedMode, setSchedMode] = useState<"week" | "day">(
    initialExact ? "day" : "week"
  );
  const [sd, setSd] = useState(initialSd);
  const [ed, setEd] = useState(initialEd);
  const [startMonth, setStartMonth] = useState(bar.startMonth || page.cm);
  const [startWeek, setStartWeek] = useState(bar.startWeek || 1);
  const [startYear, setStartYear] = useState(bar.startYear || page.year);
  const [endMonth, setEndMonth] = useState(
    bar.endMonth || bar.startMonth || page.cm
  );
  const [endWeek, setEndWeek] = useState(bar.endWeek || bar.startWeek || 1);
  const [endYear, setEndYear] = useState(
    bar.endYear || bar.startYear || page.year
  );
  const [wdAnchor, setWdAnchor] = useState<"start" | "end">("start");
  const [autoDurLabel, setAutoDurLabel] = useState(!bar.durationLabel);
  const [durationLabel, setDurationLabel] = useState(bar.durationLabel || "");
  const [progress, setProgress] = useState(clamp(Number(bar.progress) || 0, 0, 100));
  const [status, setStatus] = useState<StatusKey>(taskItem?.st || bar.status);
  const [statusLocked, setStatusLocked] = useState(Boolean(bar.statusLocked));
  const [progressText, setProgressText] = useState(bar.progressText || "");
  const [statusNote, setStatusNote] = useState(bar.statusText || "");
  const [deps, setDeps] = useState<DependencyRef[]>(row.deps || []);
  const [newPredId, setNewPredId] = useState("");
  const [newPredType, setNewPredType] = useState<DepType>("FS");

  const activeDates = useMemo(() => {
    if (schedMode === "day") {
      const s = parseISO(sd) || new Date();
      const e0 = parseISO(ed) || s;
      const e = e0 >= s ? e0 : s;
      return { s, e };
    }
    const s = weekStart(startMonth, startYear, startWeek);
    const e0 = weekEnd(endMonth, endYear, endWeek);
    return { s, e: e0 >= s ? e0 : s };
  }, [schedMode, sd, ed, startMonth, startYear, startWeek, endMonth, endYear, endWeek]);

  const hkCount = useMemo(
    () => countHK(ctx, activeDates.s, activeDates.e),
    [ctx, activeDates]
  );

  const wdUnit = lang === "en" ? "WD" : "HK";
  const wdNames = lang === "en" ? WEEKDAY_SHORT_EN : WEEKDAY_SHORT_ID;
  const dateRangeSummary = useMemo(() => {
    const { s, e } = activeDates;
    if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
      if (s.getDate() === e.getDate()) return fmtD(s, lang);
      return `${s.getDate()}–${e.getDate()} ${monthName(s.getMonth(), lang, true)} ${s.getFullYear()}`;
    }
    return `${fmtD(s, lang)} – ${fmtD(e, lang)}`;
  }, [activeDates, lang]);

  const autoDurationText = `${hkCount} ${wdUnit} (${dateRangeSummary})`;

  const handleWorkDaysChange = (val: number) => {
    const targetHk = clamp(val || 1, 1, 3000);
    if (wdAnchor === "start") {
      const newEnd = addHK(ctx, activeDates.s, targetHk);
      setEd(fmtISO(newEnd));
      if (schedMode === "week") {
        setEndMonth(monthName(newEnd.getMonth(), "id"));
        setEndWeek(weekOf(newEnd));
        setEndYear(newEnd.getFullYear());
      }
    } else {
      const newStart = subHK(ctx, activeDates.e, targetHk);
      setSd(fmtISO(newStart));
      if (schedMode === "week") {
        setStartMonth(monthName(newStart.getMonth(), "id"));
        setStartWeek(weekOf(newStart));
        setStartYear(newStart.getFullYear());
      }
    }
  };

  const handleProgressChange = (nextProg: number) => {
    const p = clamp(Math.round(nextProg), 0, 100);
    setProgress(p);
    if (!statusLocked) {
      setStatus(statusFor(status, p));
    }
  };

  const handleSave = () => {
    const trimmedName = name.trim() || row.name;
    const baseBar: Partial<NonNullable<typeof row.bar>> = {
      ms,
      progress,
      status,
      statusLocked,
      statusText: statusNote.trim() || undefined,
      progressText: progressText.trim() || undefined,
      durationLabel: autoDurLabel ? undefined : durationLabel.trim() || undefined,
    };

    if (schedMode === "day") {
      const s = parseISO(sd) || activeDates.s;
      const e0 = parseISO(ed) || s;
      const e = e0 >= s ? e0 : s;
      onSave(
        { name: trimmedName, owner: owner.trim() },
        {
          ...baseBar,
          sd: fmtISO(s),
          ed: fmtISO(e),
          startMonth: monthName(s.getMonth(), "id"),
          startWeek: weekOf(s),
          startYear: s.getFullYear(),
          endMonth: monthName(e.getMonth(), "id"),
          endWeek: weekOf(e),
          endYear: e.getFullYear(),
        },
        deps
      );
    } else {
      onSave(
        { name: trimmedName, owner: owner.trim() },
        {
          ...baseBar,
          sd: undefined,
          ed: undefined,
          startMonth,
          startWeek,
          startYear,
          endMonth,
          endWeek,
          endYear,
        },
        deps
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[600px] max-h-[90vh] rounded-2xl border border-[var(--line)] bg-white shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--line-2)]">
          <div className="w-9 h-9 rounded-xl bg-[var(--brand-50)] text-[var(--brand)] flex items-center justify-center shrink-0">
            <Icon name="edit" size="sm" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-extrabold text-[var(--ink)] leading-tight">
              {lang === "en" ? "Edit task" : "Edit task"}
            </h3>
            <p className="text-[11.5px] text-[var(--muted)] truncate">
              {row.name}
            </p>
          </div>
          <button
            type="button"
            className="ibtn sm"
            onClick={onClose}
            aria-label="Close"
          >
            <Icon name="x" size="sm" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          <div className="fg">
            <label>{lang === "en" ? "TASK NAME" : "NAMA TASK"}</label>
            <input
              type="text"
              className="inp"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="fg">
            <label>
              PIC{" "}
              <span className="kv lowercase font-medium">
                {lang === "en"
                  ? "(person in charge, optional)"
                  : "(penanggung jawab, opsional)"}
              </span>
            </label>
            <input
              type="text"
              className="inp"
              value={owner}
              placeholder="e.g. Rina (IT)"
              onChange={(e) => setOwner(e.target.value)}
            />
          </div>

          {/* Milestone Card */}
          <label className="flex items-center gap-3 p-3 rounded-xl border border-[var(--line)] bg-[#FAFBF9] cursor-pointer">
            <span className="w-8 h-8 rounded-lg bg-white border border-[var(--line)] flex items-center justify-center text-[var(--muted)] shrink-0">
              <Icon
                name={ms ? "star" : "star"}
                size="sm"
                className={ms ? "text-[#E09200]" : ""}
              />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-bold text-[12.5px] text-[var(--ink)]">
                Milestone
              </span>
              <span className="block text-[11px] text-[var(--muted)]">
                {lang === "en"
                  ? "Its finish date is shown on the milestone rail under the chart."
                  : "Tanggal selesainya ditampilkan di rel milestone di bawah chart."}
              </span>
            </span>
            <span className="tgl">
              <input
                type="checkbox"
                checked={ms}
                onChange={(e) => setMs(e.target.checked)}
              />
              <span className="tk" />
            </span>
          </label>

          {/* SCHEDULE Section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Icon name="calendar" size="sm" className="text-[var(--brand)]" />
              <span className="text-[11px] font-extrabold tracking-wider uppercase text-[var(--brand-700)]">
                {lang === "en" ? "SCHEDULE" : "JADWAL"}
              </span>
              <span className="flex-1 h-px bg-[var(--line-2)]" />
              <div className="inline-flex bg-[#EEF2EF] p-0.5 rounded-lg">
                <button
                  type="button"
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                    schedMode === "week"
                      ? "bg-white text-[var(--ink)] shadow-sm"
                      : "text-[var(--muted)]"
                  }`}
                  onClick={() => setSchedMode("week")}
                >
                  {lang === "en" ? "Weekly" : "Mingguan"}
                </button>
                <button
                  type="button"
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                    schedMode === "day"
                      ? "bg-white text-[var(--ink)] shadow-sm"
                      : "text-[var(--muted)]"
                  }`}
                  onClick={() => setSchedMode("day")}
                >
                  {lang === "en" ? "Exact dates" : "Tanggal persis"}
                </button>
              </div>
            </div>

            {schedMode === "day" ? (
              <div className="row2">
                <div className="fg">
                  <label>{lang === "en" ? "START" : "MULAI"}</label>
                  <input
                    type="date"
                    className="inp"
                    value={sd}
                    onChange={(e) => setSd(e.target.value)}
                  />
                </div>
                <div className="fg">
                  <label>{lang === "en" ? "FINISH" : "SELESAI"}</label>
                  <input
                    type="date"
                    className="inp"
                    value={ed}
                    onChange={(e) => setEd(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="row2">
                <div className="fg">
                  <label>{lang === "en" ? "START WEEK" : "MINGGU MULAI"}</label>
                  <select
                    className="inp"
                    value={`${startMonth}|${startWeek}|${startYear}`}
                    onChange={(e) => {
                      const [sm, sw, sy] = e.target.value.split("|");
                      setStartMonth(sm);
                      setStartWeek(Number(sw));
                      setStartYear(Number(sy));
                    }}
                  >
                    {page.months.flatMap((m) =>
                      m.weeks.map((w) => (
                        <option
                          key={`ms-${m.id}-${w}`}
                          value={`${m.name}|${w}|${m.year}`}
                        >
                          {m.name.slice(0, 3)} W{w} {m.year}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div className="fg">
                  <label>{lang === "en" ? "FINISH WEEK" : "MINGGU SELESAI"}</label>
                  <select
                    className="inp"
                    value={`${endMonth}|${endWeek}|${endYear}`}
                    onChange={(e) => {
                      const [em, ew, ey] = e.target.value.split("|");
                      setEndMonth(em);
                      setEndWeek(Number(ew));
                      setEndYear(Number(ey));
                    }}
                  >
                    {page.months.flatMap((m) =>
                      m.weeks.map((w) => (
                        <option
                          key={`me-${m.id}-${w}`}
                          value={`${m.name}|${w}|${m.year}`}
                        >
                          {m.name.slice(0, 3)} W{w} {m.year}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>
            )}

            {/* Date Summary Banner */}
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-[var(--line)] bg-[#FAFBF9]">
              <div className="flex items-center gap-2 text-[12px]">
                <Icon name="calendar" size="sm" className="text-[var(--muted)]" />
                <span className="font-bold text-[var(--ink)]">
                  {dateRangeSummary}
                </span>
                <span className="text-[var(--muted)]">
                  {wdNames[activeDates.s.getDay()]} –{" "}
                  {wdNames[activeDates.e.getDay()]}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-[var(--brand)] text-white text-[11px] font-extrabold">
                {hkCount} {wdUnit}
              </span>
            </div>

            {/* Duration (Work Days) */}
            <div className="fg">
              <label>
                {lang === "en"
                  ? "DURATION (WORK DAYS)"
                  : "DURASI (HARI KERJA)"}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={3000}
                  className="inp"
                  style={{ width: 76 }}
                  value={hkCount}
                  onChange={(e) => handleWorkDaysChange(Number(e.target.value))}
                />
                <span className="text-[11.5px] font-bold text-[var(--muted)] shrink-0">
                  {wdUnit}
                </span>
                <select
                  className="inp flex-1"
                  value={wdAnchor}
                  onChange={(e) =>
                    setWdAnchor(e.target.value as "start" | "end")
                  }
                >
                  <option value="start">
                    {lang === "en"
                      ? "Start fixed, Finish computed"
                      : "Mulai tetap, Selesai dihitung"}
                  </option>
                  <option value="end">
                    {lang === "en"
                      ? "Finish fixed, Start computed"
                      : "Selesai tetap, Mulai dihitung"}
                  </option>
                </select>
              </div>
            </div>

            {/* Duration Label */}
            <div className="fg">
              <label>{lang === "en" ? "DURATION LABEL" : "LABEL DURASI"}</label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  className="inp flex-1 disabled:bg-[#F3F5F4] disabled:text-[var(--muted)]"
                  disabled={autoDurLabel}
                  value={autoDurLabel ? autoDurationText : durationLabel}
                  onChange={(e) => setDurationLabel(e.target.value)}
                />
                <label className="tgl shrink-0">
                  <input
                    type="checkbox"
                    checked={autoDurLabel}
                    onChange={(e) => setAutoDurLabel(e.target.checked)}
                  />
                  <span className="tk" />
                  <span className="text-[12px] font-semibold">Auto</span>
                </label>
              </div>
            </div>
          </div>

          {/* PROGRESS & STATUS Section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Icon name="check" size="sm" className="text-[var(--brand)]" />
              <span className="text-[11px] font-extrabold tracking-wider uppercase text-[var(--brand-700)]">
                PROGRESS & STATUS
              </span>
              <span className="flex-1 h-px bg-[var(--line-2)]" />
            </div>

            <div className="fg">
              <label>PROGRESS</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={progress}
                  onChange={(e) => handleProgressChange(Number(e.target.value))}
                  className="flex-1 accent-[var(--brand)]"
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="inp text-center font-bold"
                  style={{ width: 68 }}
                  value={progress}
                  onChange={(e) => handleProgressChange(Number(e.target.value))}
                />
                <span className="text-[12px] font-bold text-[var(--muted)]">
                  %
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                {[0, 25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition ${
                      progress === pct
                        ? "border-[var(--brand)] bg-[var(--brand-50)] text-[var(--brand-700)]"
                        : "border-[var(--line)] bg-white text-[var(--ink-2)] hover:bg-[var(--line-2)]"
                    }`}
                    onClick={() => handleProgressChange(pct)}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* 4 Status Cards */}
            <div className="grid grid-cols-4 gap-2">
              {(["done", "inprogress", "atrisk", "notstarted"] as const).map(
                (st) => {
                  const meta = STATUS_META[st];
                  const active = status === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        setStatus(st);
                        setStatusLocked(true);
                      }}
                      className={`flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl border text-center transition ${
                        active
                          ? "border-[#9AA8A0] bg-[#F7FAF8] ring-2 ring-[#D8E0DB]"
                          : "border-[var(--line)] bg-white hover:bg-[#FAFBF9]"
                      }`}
                    >
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white"
                        style={{ background: meta.color }}
                      >
                        <Icon name={meta.icon} size="xs" />
                      </span>
                      <span className="text-[11px] font-bold text-[var(--ink)] leading-tight">
                        {t(`st.${st}.label`)}
                      </span>
                    </button>
                  );
                }
              )}
            </div>

            {/* Lock Status Row */}
            <div className="flex items-center justify-between gap-2">
              <label className="tgl">
                <input
                  type="checkbox"
                  checked={statusLocked}
                  onChange={(e) => setStatusLocked(e.target.checked)}
                />
                <span className="tk" />
                <span className="tx">
                  <span>{lang === "en" ? "Lock status" : "Kunci status"}</span>
                  <small>
                    {lang === "en"
                      ? "Ignore auto status for this task"
                      : "Abaikan auto-status untuk task ini"}
                  </small>
                </span>
              </label>
              <span className="text-[10.5px] text-[var(--muted)] text-right">
                {page.today
                  ? `${lang === "en" ? "Auto status active" : "Auto-status aktif"}`
                  : lang === "en"
                    ? "Fill in today's date for auto status"
                    : "Isi tanggal hari ini untuk auto-status"}
              </span>
            </div>

            {/* Progress Text & Status Note */}
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
              <div className="fg">
                <label>{lang === "en" ? "PROGRESS TEXT" : "TEKS PROGRESS"}</label>
                <input
                  type="text"
                  className="inp"
                  value={progressText}
                  placeholder="e.g. 61.9%"
                  onChange={(e) => setProgressText(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn sm mb-0.5"
                onClick={() => setProgressText(`${progress}%`)}
              >
                = %
              </button>
              <div className="fg">
                <label>{lang === "en" ? "STATUS NOTE" : "CATATAN STATUS"}</label>
                <input
                  type="text"
                  className="inp"
                  value={statusNote}
                  placeholder="e.g. (4/5 CR)"
                  onChange={(e) => setStatusNote(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* DEPENDENCY (PREDECESSOR) Section */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <Icon name="dep" size="sm" className="text-[var(--brand)]" />
              <span className="text-[11px] font-extrabold tracking-wider uppercase text-[var(--brand-700)]">
                DEPENDENCY (PREDECESSOR)
              </span>
              <span className="flex-1 h-px bg-[var(--line-2)]" />
            </div>

            {deps.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {deps.map((dep) => {
                  const targetTask = page.rows.find((x) => x.id === dep.id);
                  return (
                    <span
                      key={dep.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EEF4FF] text-[#1D4ED8] text-[11.5px] font-bold"
                    >
                      <Icon name="dep" size="xs" />
                      <span>{targetTask?.name || dep.id}</span>
                      <span className="px-1.5 py-0.2 rounded bg-white/80 text-[10px] font-extrabold">
                        {dep.type}
                      </span>
                      <button
                        type="button"
                        className="hover:text-[#E53935] ml-0.5"
                        onClick={() =>
                          setDeps((prev) => prev.filter((d) => d.id !== dep.id))
                        }
                        aria-label="Remove dependency"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            <div className="flex items-center gap-2">
              <select
                className="inp flex-1"
                value={newPredId}
                onChange={(e) => setNewPredId(e.target.value)}
              >
                <option value="">
                  {lang === "en"
                    ? "— pick a predecessor —"
                    : "— pilih predecessor —"}
                </option>
                {page.rows
                  .filter(
                    (other) =>
                      other.type === "task" &&
                      other.id !== row.id &&
                      !deps.some((d) => d.id === other.id)
                  )
                  .map((other) => (
                    <option key={other.id} value={other.id}>
                      {other.name}
                    </option>
                  ))}
              </select>
              <select
                className="inp"
                style={{ width: 72 }}
                value={newPredType}
                onChange={(e) => setNewPredType(e.target.value as DepType)}
              >
                <option value="FS">FS</option>
                <option value="SS">SS</option>
                <option value="FF">FF</option>
                <option value="SF">SF</option>
              </select>
              <button
                type="button"
                className="btn soft"
                disabled={!newPredId}
                onClick={() => {
                  if (!newPredId) return;
                  setDeps((prev) => [
                    ...prev.filter((d) => d.id !== newPredId),
                    { id: newPredId, type: newPredType },
                  ]);
                  setNewPredId("");
                }}
              >
                + {lang === "en" ? "Add" : "Tambah"}
              </button>
            </div>

            <p className="text-[10.5px] text-[var(--muted)] m-0 leading-relaxed">
              FS = start after the predecessor finishes · SS = start together · FF =
              finish together · SF = finish after the predecessor starts
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--line-2)] bg-white">
          <button
            type="button"
            className="btn text-[#E53935] border-[#FECACA] hover:bg-[#FEF2F2]"
            onClick={onDelete}
          >
            <Icon name="trash" size="sm" />
            <span>{lang === "en" ? "Delete" : "Hapus"}</span>
          </button>
          <div className="flex items-center gap-2">
            <button type="button" className="btn" onClick={onClose}>
              {lang === "en" ? "Cancel" : "Batal"}
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={handleSave}
            >
              <Icon name="check" size="sm" />
              <span>{lang === "en" ? "Save" : "Simpan"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
