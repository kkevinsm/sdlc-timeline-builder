import { STATUS_META } from "@/constants/theme";
import { formatRangeLabel } from "@/engine/calendar";
import type { TimelineModel } from "@/engine/layoutModel";
import type { LangCode } from "@/types/timeline";

/**
 * Renders the active TimelineModel onto an offscreen HiDPI (2x) HTML5 Canvas
 * and downloads a crisp PNG image without external dependencies.
 */
export function exportTimelineToPng(
  model: TimelineModel,
  lang: LangCode,
  fileName = "timeline.png"
): void {
  const { page, cols, monthGroups, colW, visibleRows, tu } = model;
  const scale = 2;
  const padX = 28;
  const headerH = 92;
  const legendH = page.showLegend ? 32 : 8;
  const tableHeaderH = model.mode === "month" ? 32 : 48;
  const rowH = Math.max(30, page.rh);
  const bodyH = Math.max(1, visibleRows.length) * rowH;
  const railH = page.msRail && model.railMarks.length > 0 ? 54 : 18;

  const fixedW =
    page.lw + (page.showOwner ? page.ow : 0) + page.dw + page.sw;
  const gridW = Math.max(240, cols.length * colW);
  const totalW = padX * 2 + fixedW + gridW;
  const totalH = headerH + legendH + tableHeaderH + bodyH + railH + 24;

  const canvas = document.createElement("canvas");
  canvas.width = totalW * scale;
  canvas.height = totalH * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

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
  if (page.showLegend) {
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
  ctx.fillRect(padX, tableTop, fixedW + gridW, model.mode === "month" ? tableHeaderH : 24);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "800 10px 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("TASK", padX + 10, tableTop + 16);

  if (model.mode !== "month") {
    ctx.textAlign = "center";
    monthGroups.forEach((mg) => {
      const mx = gridX + mg.i0 * colW;
      const mw = mg.n * colW;
      ctx.fillText(mg.label, mx + mw / 2, tableTop + 16);
    });
    ctx.fillStyle = "#F7FAF8";
    ctx.fillRect(gridX, tableTop + 24, gridW, 24);
    ctx.fillStyle = "#3A4841";
    ctx.font = "700 10px 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif";
    cols.forEach((c, i) => {
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

  // Rows
  visibleRows.forEach((it, idx) => {
    const ry = bodyTop + idx * rowH;
    ctx.fillStyle =
      it.kind === "group"
        ? "#F2F7F4"
        : idx % 2 === 1
          ? "#FAFBF9"
          : "#FFFFFF";
    ctx.fillRect(padX, ry, fixedW + gridW, rowH);
    ctx.strokeStyle = "#E2E8E4";
    ctx.beginPath();
    ctx.moveTo(padX, ry);
    ctx.lineTo(padX + fixedW + gridW, ry);
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = it.kind === "group" ? "#0B4622" : "#16211B";
    ctx.font = `${it.kind === "group" ? "800" : "600"} 11px 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif`;
    ctx.fillText(it.row.name.slice(0, 32), padX + 10, ry + rowH / 2 + 4);

    if (it.kind === "task") {
      ctx.fillStyle = "#4F5D56";
      ctx.font = "500 10px 'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif";
      const dStr = it.bd ? formatRangeLabel(it.bd, lang) : "—";
      ctx.fillText(dStr, padX + page.lw + (page.showOwner ? page.ow : 0) + 8, ry + rowH / 2 + 4);

      if (it.u0 != null && it.u1 != null) {
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
    }
  });

  // Today line
  if (page.showToday && tu != null) {
    ctx.save();
    ctx.strokeStyle = "#1F2A24";
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(gridX + tu * colW, bodyTop);
    ctx.lineTo(gridX + tu * colW, bodyTop + bodyH);
    ctx.stroke();
    ctx.restore();
  }

  // Border
  ctx.strokeStyle = "#D8E0DB";
  ctx.strokeRect(padX, tableTop, fixedW + gridW, tableHeaderH + bodyH);

  const link = document.createElement("a");
  link.download = fileName;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
