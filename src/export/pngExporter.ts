import { STATUS_META } from "@/constants/theme";
import { fmtD, formatRangeLabel, monthIndex, monthName, weekOf } from "@/engine/calendar";
import { collectDepEdges, routeDepPath } from "@/engine/dependency";
import type { TimelineModel } from "@/engine/layoutModel";
import type { ColumnKey, LangCode } from "@/types/timeline";

export interface PngExportOptions {
  showDuration?: boolean;
  showStatus?: boolean;
  showOwner?: boolean;
  showDeps?: boolean;
  showToday?: boolean;
  showLegend?: boolean;
  showRail?: boolean;
}

/**
 * Renders the active TimelineModel onto an offscreen HiDPI (2x) HTML5 Canvas
 * and downloads a crisp PNG image without external dependencies.
 */
export function renderTimelineToDataUrl(
  model: TimelineModel,
  lang: LangCode,
  opts: PngExportOptions = {}
): string {
  const { page, cols, monthGroups, colW, visibleRows, tu } = model;
  const showDuration = opts.showDuration ?? true;
  const showStatus = opts.showStatus ?? true;
  const showOwner = opts.showOwner ?? page.showOwner;
  const showDeps = opts.showDeps ?? page.showDeps;
  const showToday = opts.showToday ?? page.showToday;
  const showLegend = opts.showLegend ?? page.showLegend;
  const showRail = opts.showRail ?? page.msRail;

  const defaultOrder: ColumnKey[] = ["task", "owner", "duration", "status"];
  const rawOrder =
    page.colOrder && page.colOrder.length === 4 ? page.colOrder : defaultOrder;
  const visibleCols = rawOrder.filter((k) => {
    if (k === "owner") return showOwner;
    if (k === "duration") return showDuration;
    if (k === "status") return showStatus;
    return true;
  });

  const colWidthOf = (k: ColumnKey): number => {
    if (k === "task") return page.lw;
    if (k === "owner") return page.ow;
    if (k === "duration") return page.dw;
    return page.sw;
  };

  const scale = 2;
  const padX = 28;
  const headerH = 92;
  const legendH = showLegend ? 32 : 8;
  const tableHeaderH = model.mode === "month" ? 32 : 48;
  const rowH = Math.max(30, page.rh);
  const bodyH = Math.max(1, visibleRows.length) * rowH;
  const railH = showRail && model.railMarks.length > 0 ? 54 : 18;

  const fixedW = visibleCols.reduce((sum, k) => sum + colWidthOf(k), 0);
  const gridW = Math.max(240, cols.length * colW);
  const totalW = padX * 2 + fixedW + gridW;
  const totalH = headerH + legendH + tableHeaderH + bodyH + railH + 24;

  const canvas = document.createElement("canvas");
  canvas.width = totalW * scale;
  canvas.height = totalH * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.scale(scale, scale);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, totalW, totalH);

  // Title & Subtitle
  ctx.fillStyle = "#0F1813";
  ctx.font = "800 22px 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(page.title || "Timeline Project", totalW / 2, 42);

  if (page.subtitle) {
    ctx.fillStyle = "#6B7A72";
    ctx.font = "500 12px 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif";
    ctx.fillText(page.subtitle, totalW / 2, 62);
  }

  // Accent rule
  ctx.fillStyle = page.accent;
  ctx.fillRect(padX, 78, totalW - padX * 2, 3);

  // Legend
  if (showLegend) {
    ctx.textAlign = "left";
    ctx.font = "600 11px 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif";
    let lx = padX;
    const ly = 102;
    const keys: ("done" | "inprogress" | "atrisk" | "notstarted")[] = [
      "done",
      "inprogress",
      "atrisk",
      "notstarted",
    ];
    keys.forEach((st) => {
      ctx.fillStyle = STATUS_META[st].color;
      ctx.beginPath();
      ctx.arc(lx + 4, ly - 3, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3A4841";
      const label =
        st === "done"
          ? lang === "en"
            ? "Done / On-track"
            : "Selesai / On-track"
          : st === "inprogress"
            ? "In Progress"
            : st === "atrisk"
              ? "At Risk"
              : lang === "en"
                ? "Not Started"
                : "Belum mulai";
      ctx.fillText(label, lx + 13, ly);
      lx += ctx.measureText(label).width + 28;
    });
  }

  const tableTop = headerH + legendH;
  const gridX = padX + fixedW;

  // Table Headers
  ctx.fillStyle = page.accent;
  ctx.fillRect(
    padX,
    tableTop,
    fixedW + gridW,
    model.mode === "month" ? tableHeaderH : 24
  );
  // Left columns full header height background
  ctx.fillRect(padX, tableTop, fixedW, tableHeaderH);

  let cx = padX;
  visibleCols.forEach((k, idx) => {
    const w = colWidthOf(k);
    if (idx > 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.beginPath();
      ctx.moveTo(cx, tableTop);
      ctx.lineTo(cx, tableTop + tableHeaderH);
      ctx.stroke();
    }
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "800 10px 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif";
    const hdrLabel =
      k === "task"
        ? "TASK"
        : k === "owner"
          ? "PIC"
          : k === "duration"
            ? lang === "en"
              ? "DURATION"
              : "DURASI"
            : "STATUS";
    if (k === "task") {
      ctx.textAlign = "left";
      ctx.fillText(hdrLabel, cx + 10, tableTop + tableHeaderH / 2 + 4);
    } else {
      ctx.textAlign = "center";
      ctx.fillText(hdrLabel, cx + w / 2, tableTop + tableHeaderH / 2 + 4);
    }
    cx += w;
  });

  if (model.mode !== "month") {
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "800 10px 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif";
    monthGroups.forEach((mg) => {
      const mx = gridX + mg.i0 * colW;
      const mw = mg.n * colW;
      ctx.fillText(mg.label, mx + mw / 2, tableTop + 16);
    });
    ctx.fillStyle = "#F7FAF8";
    ctx.fillRect(gridX, tableTop + 24, gridW, 24);
    ctx.font = "700 10px 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif";
    cols.forEach((c, i) => {
      const refDate = model.td;
      const isCurrentCol = Boolean(
        showToday &&
          tu != null &&
          ((refDate &&
            c.kind === "day" &&
            c.month === monthName(refDate.getMonth(), "id") &&
            c.year === refDate.getFullYear() &&
            c.week === weekOf(refDate)) ||
            (refDate &&
              c.kind !== "day" &&
              refDate >= c.ds &&
              refDate <= c.de) ||
            (!refDate &&
              c.month === page.cm &&
              c.year === page.cy &&
              c.week === page.cw))
      );
      if (isCurrentCol) {
        ctx.fillStyle = "#1F2A24";
        ctx.fillRect(gridX + i * colW, tableTop + 24, colW, 24);
        ctx.fillStyle = "#FFFFFF";
      } else {
        ctx.fillStyle = "#3A4841";
      }
      ctx.fillText(c.label, gridX + i * colW + colW / 2, tableTop + 40);
    });
  }

  const bodyTop = tableTop + tableHeaderH;

  // Vertical Grid
  cols.forEach((_, i) => {
    ctx.strokeStyle = "#EEF2EF";
    ctx.beginPath();
    ctx.moveTo(gridX + i * colW, bodyTop);
    ctx.lineTo(gridX + i * colW, bodyTop + bodyH);
    ctx.stroke();
  });

  // Helper to clip text inside cell
  const drawClippedText = (
    text: string,
    x: number,
    y: number,
    maxW: number,
    align: CanvasTextAlign = "left"
  ) => {
    ctx.save();
    ctx.beginPath();
    const clipX = align === "center" ? x - maxW / 2 : x;
    ctx.rect(clipX, y - 14, maxW, 20);
    ctx.clip();
    ctx.textAlign = align;
    ctx.fillText(text, x, y);
    ctx.restore();
  };

  // Rows
  visibleRows.forEach((it, idx) => {
    const ry = bodyTop + idx * rowH;
    ctx.fillStyle =
      it.kind === "group"
        ? "#F2F7F4"
        : it.kind === "task" && it.last
          ? "#FFFBEB"
          : idx % 2 === 1
            ? "#FAFBF9"
            : "#FFFFFF";
    ctx.fillRect(padX, ry, fixedW + gridW, rowH);
    ctx.strokeStyle = "#E2E8E4";
    ctx.beginPath();
    ctx.moveTo(padX, ry);
    ctx.lineTo(padX + fixedW + gridW, ry);
    ctx.stroke();

    let cellX = padX;
    visibleCols.forEach((k, cIdx) => {
      const w = colWidthOf(k);
      if (cIdx > 0) {
        ctx.strokeStyle = "#EEF2EF";
        ctx.beginPath();
        ctx.moveTo(cellX, ry);
        ctx.lineTo(cellX, ry + rowH);
        ctx.stroke();
      }

      if (it.kind === "group") {
        if (k === "task") {
          ctx.fillStyle = "#0B4622";
          ctx.font = "800 11px 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif";
          drawClippedText(it.row.name, cellX + 10, ry + rowH / 2 + 4, w - 16, "left");
        } else if (k === "duration") {
          ctx.fillStyle = "#6B7A72";
          ctx.font = "700 10px 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif";
          drawClippedText(
            `${it.n} ${lang === "en" ? "task(s)" : "task"}`,
            cellX + w / 2,
            ry + rowH / 2 + 4,
            w - 10,
            "center"
          );
        } else if (k === "status") {
          ctx.fillStyle = "#0F5A2C";
          ctx.font = "800 10.5px 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif";
          drawClippedText(
            it.prog != null ? `${it.prog}%` : "—",
            cellX + w / 2,
            ry + rowH / 2 + 4,
            w - 10,
            "center"
          );
        }
      } else {
        // Task row
        const stCol = STATUS_META[it.st].color;
        if (k === "task") {
          let tx = cellX + 10;
          if (it.ms) {
            ctx.fillStyle = it.last ? "#E09200" : stCol;
            ctx.font = "700 11px 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif";
            ctx.textAlign = "left";
            ctx.fillText(it.last ? "★" : "◆", tx, ry + rowH / 2 + 4);
            tx += 14;
          }
          ctx.fillStyle = "#16211B";
          ctx.font = "600 11px 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif";
          drawClippedText(
            it.row.name,
            tx,
            ry + rowH / 2 + 4,
            cellX + w - tx - 6,
            "left"
          );
        } else if (k === "owner") {
          ctx.fillStyle = "#3A4841";
          ctx.font = "500 10.5px 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif";
          drawClippedText(
            it.row.owner || "—",
            cellX + 8,
            ry + rowH / 2 + 4,
            w - 16,
            "left"
          );
        } else if (k === "duration") {
          ctx.fillStyle = "#4F5D56";
          ctx.font = "500 10px 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif";
          const durText = it.row.bar?.durationLabel
            ? it.row.bar.durationLabel
            : it.bd
              ? `${formatRangeLabel(it.bd, lang)}${it.hk > 0 ? ` (${it.hk} ${lang === "en" ? "WD" : "HK"})` : ""}`
              : "—";
          drawClippedText(
            durText,
            cellX + w / 2,
            ry + rowH / 2 + 4,
            w - 10,
            "center"
          );
        } else if (k === "status") {
          const stText = `${it.row.bar?.progressText || `${it.prog}%`}${it.row.bar?.statusText ? ` ${it.row.bar.statusText}` : ""}`;
          ctx.font = "700 10px 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif";
          const textW = ctx.measureText(stText).width;
          const pillW = Math.min(w - 12, textW + 22);
          const pillH = 18;
          const pillX = cellX + (w - pillW) / 2;
          const pillY = ry + (rowH - pillH) / 2;

          ctx.fillStyle = `${stCol}1F`;
          ctx.beginPath();
          ctx.roundRect(pillX, pillY, pillW, pillH, 9);
          ctx.fill();

          ctx.fillStyle = stCol;
          ctx.beginPath();
          ctx.arc(pillX + 8, ry + rowH / 2, 3, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = it.st === "notstarted" ? "#5A6961" : stCol;
          drawClippedText(
            stText,
            pillX + 14,
            ry + rowH / 2 + 3.5,
            pillW - 18,
            "left"
          );
        }
      }

      cellX += w;
    });

    if (it.kind === "group" && page.groupRollup && it.u0 != null && it.u1 != null && it.u1 > it.u0) {
      const bx = gridX + it.u0 * colW;
      const bw = Math.max(8, (it.u1 - it.u0) * colW);
      ctx.fillStyle = page.accent;
      ctx.beginPath();
      ctx.roundRect(bx, ry + rowH / 2 - 4, bw, 8, 4);
      ctx.fill();
    } else if (it.kind === "task" && it.u0 != null && it.u1 != null) {
      const bx = gridX + it.u0 * colW;
      const bw = Math.max(10, (it.u1 - it.u0) * colW);
      const by = ry + rowH / 2 - 7;
      const stCol = STATUS_META[it.st].color;
      ctx.fillStyle = `${stCol}33`;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, 14, 7);
      ctx.fill();
      if (it.prog > 0) {
        ctx.fillStyle = stCol;
        ctx.beginPath();
        ctx.roundRect(bx, by, Math.max(6, bw * (it.prog / 100)), 14, 7);
        ctx.fill();
      }
    }
  });

  // Dependency Arrows
  if (showDeps) {
    const depEdges = collectDepEdges(page);
    const rowYMap = new Map<string, number>();
    visibleRows.forEach((it, idx) => {
      rowYMap.set(it.row.id, bodyTop + idx * rowH + rowH / 2);
    });

    depEdges.forEach((edge) => {
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
        return;
      }
      const x1 =
        gridX +
        (edge.type === "SS" || edge.type === "SF" ? fromItem.u0 : fromItem.u1) *
          colW;
      const x2 =
        gridX +
        (edge.type === "FF" || edge.type === "SF" ? toItem.u1 : toItem.u0) *
          colW;
      const d = routeDepPath(x1, y1, x2, y2, edge.type);

      ctx.save();
      ctx.strokeStyle = edge.conflict ? "#E53935" : page.depColor;
      ctx.lineWidth = edge.conflict ? 1.8 : 1.4;
      if (edge.conflict) ctx.setLineDash([3, 2]);
      const p = new Path2D(d);
      ctx.stroke(p);

      // Arrowhead pointing into x2, y2
      ctx.setLineDash([]);
      ctx.fillStyle = edge.conflict ? "#E53935" : page.depColor;
      const dir = edge.type === "FF" || edge.type === "SF" ? -1 : 1;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - 6 * dir, y2 - 3);
      ctx.lineTo(x2 - 6 * dir, y2 + 3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
  }

  // Today line
  if (showToday && tu != null) {
    const tx = gridX + tu * colW;
    ctx.save();
    ctx.strokeStyle = "#1F2A24";
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(tx, bodyTop);
    ctx.lineTo(tx, bodyTop + bodyH);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#1F2A24";
    ctx.beginPath();
    ctx.arc(tx, bodyTop, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(tx, bodyTop + bodyH, 3.5, 0, Math.PI * 2);
    ctx.fill();

    if (!showRail) {
      const labelDate =
        model.tuKind === "today" && model.td
          ? fmtD(model.td, lang)
          : `W${page.cw} ${monthName(monthIndex(page.cm), lang, true)} ${page.cy}`;
      ctx.textAlign = "center";
      ctx.font = "800 10px 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif";
      ctx.fillStyle = "#16211B";
      ctx.fillText(labelDate, tx, bodyTop + bodyH + 14);
    }
    ctx.restore();
  }

  // Border
  ctx.strokeStyle = "#D8E0DB";
  ctx.strokeRect(padX, tableTop, fixedW + gridW, tableHeaderH + bodyH);

  return canvas.toDataURL("image/png");
}

export function exportTimelineToPng(
  model: TimelineModel,
  lang: LangCode,
  fileName = "timeline.png",
  opts: PngExportOptions = {}
): void {
  const dataUrl = renderTimelineToDataUrl(model, lang, opts);
  if (!dataUrl) return;
  const link = document.createElement("a");
  link.download = fileName;
  link.href = dataUrl;
  link.click();
}

export function exportTimelineToPdf(
  model: TimelineModel,
  lang: LangCode,
  title = "Timeline",
  opts: PngExportOptions = {}
): boolean {
  const dataUrl = renderTimelineToDataUrl(model, lang, opts);
  if (!dataUrl) return false;
  const win = window.open("", "_blank", "width=1200,height=800");
  if (!win) return false;
  const safeTitle = title.replace(/[<>&"]/g, "");
  win.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <style>
    @page { size: landscape; margin: 8mm; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    img { max-width: 100%; max-height: 100vh; width: auto; height: auto; display: block; }
  </style>
</head>
<body>
  <img src="${dataUrl}" alt="${safeTitle}" />
  <script>
    window.onload = function () {
      setTimeout(function () { window.focus(); window.print(); }, 150);
    };
  </script>
</body>
</html>`);
  win.document.close();
  return true;
}
