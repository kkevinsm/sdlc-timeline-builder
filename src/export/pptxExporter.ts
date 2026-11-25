import PptxGenJS from "pptxgenjs";
import { translate } from "@/constants/i18n";
import {
  filterExecRows,
  SLIDE_STYLE_DEFS,
  type ExportOptions,
} from "@/constants/styles";
import { STATUS_META } from "@/constants/theme";
import { fmtD, formatRangeLabel } from "@/engine/calendar";
import { collectDepEdges } from "@/engine/dependency";
import {
  buildTimelineModel,
  type ModelItem,
  type TimelineModel,
} from "@/engine/layoutModel";
import type { PageData, ProjectData, ScaleMode } from "@/types/timeline";

const PW = 13.333;
const PH = 7.5;
const MX = 0.45;

function hex(c: string): string {
  return (c || "#1B7A3E").replace("#", "").toUpperCase();
}

function mixHex(c: string, amount = 0.8): string {
  const clean = hex(c);
  const r = parseInt(clean.slice(0, 2), 16) || 27;
  const g = parseInt(clean.slice(2, 4), 16) || 122;
  const b = parseInt(clean.slice(4, 6), 16) || 62;
  const mr = Math.round(r + (255 - r) * amount);
  const mg = Math.round(g + (255 - g) * amount);
  const mb = Math.round(b + (255 - b) * amount);
  return [mr, mg, mb].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function addSlideHeader(
  pres: PptxGenJS,
  slide: PptxGenJS.Slide,
  page: PageData,
  opts: ExportOptions,
  partSuffix = ""
) {
  const face = opts.font;
  const acc = hex(page.accent);

  // Left logo or text badge
  if (page.logoL) {
    slide.addImage({
      data: page.logoL,
      x: MX,
      y: 0.24,
      w: 1.15,
      h: 0.44,
      sizing: { type: "contain", w: 1.15, h: 0.44 },
    });
  } else if (page.logl) {
    slide.addShape(pres.ShapeType.roundRect, {
      x: MX,
      y: 0.28,
      w: 1.25,
      h: 0.36,
      fill: { color: hex(page.loglc) },
      line: { color: hex(page.loglc), width: 0 },
      rectRadius: 0.08,
    });
    slide.addText(page.logl, {
      x: MX,
      y: 0.28,
      w: 1.25,
      h: 0.36,
      fontFace: face,
      fontSize: 10,
      bold: true,
      color: "FFFFFF",
      align: "center",
      valign: "middle",
    });
  }

  // Right logo + Target Badge
  let xr = PW - MX;
  if (page.logoR) {
    xr -= 1.15;
    slide.addImage({
      data: page.logoR,
      x: xr,
      y: 0.24,
      w: 1.15,
      h: 0.44,
      sizing: { type: "contain", w: 1.15, h: 0.44 },
    });
    xr -= 0.14;
  } else if (page.logr) {
    xr -= 1.25;
    slide.addShape(pres.ShapeType.roundRect, {
      x: xr,
      y: 0.28,
      w: 1.25,
      h: 0.36,
      fill: { color: hex(page.logrc) },
      line: { color: hex(page.logrc), width: 0 },
      rectRadius: 0.08,
    });
    slide.addText(page.logr, {
      x: xr,
      y: 0.28,
      w: 1.25,
      h: 0.36,
      fontFace: face,
      fontSize: 10,
      bold: true,
      color: "FFFFFF",
      align: "center",
      valign: "middle",
    });
    xr -= 0.14;
  }

  if (page.tgt) {
    const bw = Math.min(2.1, Math.max(1.1, page.tgt.length * 0.09 + 0.4));
    xr -= bw;
    slide.addShape(pres.ShapeType.roundRect, {
      x: xr,
      y: 0.3,
      w: bw,
      h: 0.32,
      fill: { color: hex(page.tgtc) },
      line: { color: hex(page.tgtc), width: 0 },
      rectRadius: 0.16,
    });
    slide.addText(page.tgt, {
      x: xr,
      y: 0.3,
      w: bw,
      h: 0.32,
      fontFace: face,
      fontSize: 9.5,
      bold: true,
      color: "FFFFFF",
      align: "center",
      valign: "middle",
    });
  }

  // Center Title & Subtitle
  const titleText = (page.title || "Timeline Project") + partSuffix;
  slide.addText(titleText, {
    x: 2.2,
    y: 0.2,
    w: PW - 4.4,
    h: 0.38,
    fontFace: face,
    fontSize: 18,
    bold: true,
    color: "0F1813",
    align: "center",
    valign: "middle",
  });
  if (page.subtitle) {
    slide.addText(page.subtitle, {
      x: 2.2,
      y: 0.56,
      w: PW - 4.4,
      h: 0.24,
      fontFace: face,
      fontSize: 10,
      color: "6B7A72",
      align: "center",
      valign: "middle",
    });
  }

  // Accent Rule
  slide.addShape(pres.ShapeType.rect, {
    x: MX,
    y: 0.88,
    w: PW - 2 * MX,
    h: 0.03,
    fill: { color: acc },
    line: { color: acc, width: 0 },
  });
}

function addSummarySlide(
  pres: PptxGenJS,
  page: PageData,
  model: TimelineModel,
  opts: ExportOptions
) {
  const slide = pres.addSlide();
  const face = opts.font;
  const el = opts.lang;
  addSlideHeader(
    pres,
    slide,
    page,
    opts,
    el === "en" ? " — Executive Summary" : " — Ringkasan Eksekutif"
  );

  // KPI Cards
  const kpis = [
    {
      label: el === "en" ? "Overall Progress" : "Progress Keseluruhan",
      value: model.overall != null ? `${model.overall}%` : "0%",
      color: hex(page.accent),
    },
    {
      label: translate(el, "st.done.label"),
      value: String(model.counts.done),
      color: hex(STATUS_META.done.color),
    },
    {
      label: translate(el, "st.inprogress.label"),
      value: String(model.counts.inprogress),
      color: hex(STATUS_META.inprogress.color),
    },
    {
      label: translate(el, "st.atrisk.label"),
      value: String(model.counts.atrisk),
      color: hex(STATUS_META.atrisk.color),
    },
    {
      label: translate(el, "st.notstarted.label"),
      value: String(model.counts.notstarted),
      color: "6B7A72",
    },
  ];

  const gap = 0.16;
  const cardW = (PW - 2 * MX - gap * 4) / 5;
  kpis.forEach((k, i) => {
    const x = MX + i * (cardW + gap);
    slide.addShape(pres.ShapeType.roundRect, {
      x,
      y: 1.15,
      w: cardW,
      h: 1.05,
      fill: { color: "F7FAF8" },
      line: { color: "E2E8E4", width: 1 },
      rectRadius: 0.08,
    });
    slide.addShape(pres.ShapeType.rect, {
      x,
      y: 1.15,
      w: cardW,
      h: 0.06,
      fill: { color: k.color },
      line: { color: k.color, width: 0 },
    });
    slide.addText(k.value, {
      x: x + 0.14,
      y: 1.32,
      w: cardW - 0.28,
      h: 0.45,
      fontFace: face,
      fontSize: 22,
      bold: true,
      color: k.color,
    });
    slide.addText(k.label, {
      x: x + 0.14,
      y: 1.78,
      w: cardW - 0.28,
      h: 0.3,
      fontFace: face,
      fontSize: 9.5,
      bold: true,
      color: "3A4841",
    });
  });

  // Key Milestones & At Risk Table
  const highlights = model.tasks.filter((t) => t.ms || t.st === "atrisk").slice(0, 10);
  slide.addText(
    el === "en"
      ? "Key Milestones & Attention Items"
      : "Milestone Utama & Item Perlu Perhatian",
    {
      x: MX,
      y: 2.42,
      w: PW - 2 * MX,
      h: 0.32,
      fontFace: face,
      fontSize: 12,
      bold: true,
      color: "16211B",
    }
  );

  const tableY = 2.8;
  const rowH = 0.38;
  const colsW = [5.5, 2.3, 2.2, 2.43];
  const headers =
    el === "en"
      ? ["TASK / MILESTONE", "SCHEDULE", "STATUS", "PROGRESS"]
      : ["TASK / MILESTONE", "JADWAL", "STATUS", "PROGRESS"];

  let curX = MX;
  headers.forEach((h, i) => {
    slide.addShape(pres.ShapeType.rect, {
      x: curX,
      y: tableY,
      w: colsW[i],
      h: 0.34,
      fill: { color: hex(page.accent) },
      line: { color: "FFFFFF", width: 0.5 },
    });
    slide.addText(h, {
      x: curX + 0.1,
      y: tableY,
      w: colsW[i] - 0.2,
      h: 0.34,
      fontFace: face,
      fontSize: 9,
      bold: true,
      color: "FFFFFF",
      valign: "middle",
    });
    curX += colsW[i];
  });

  highlights.forEach((item, rIdx) => {
    const ry = tableY + 0.34 + rIdx * rowH;
    const bg = rIdx % 2 === 1 ? "FAFBF9" : "FFFFFF";
    const vals = [
      `${item.ms ? (item.last ? "★ " : "◆ ") : ""}${item.row.name}`,
      item.bd ? formatRangeLabel(item.bd, el) : "—",
      translate(el, `st.${item.st}.label`),
      `${item.prog}%`,
    ];
    let cx = MX;
    vals.forEach((v, ci) => {
      slide.addShape(pres.ShapeType.rect, {
        x: cx,
        y: ry,
        w: colsW[ci],
        h: rowH,
        fill: { color: bg },
        line: { color: "E2E8E4", width: 0.5 },
      });
      slide.addText(v, {
        x: cx + 0.1,
        y: ry,
        w: colsW[ci] - 0.2,
        h: rowH,
        fontFace: face,
        fontSize: 9.5,
        bold: ci === 2 || ci === 3,
        color:
          ci === 2
            ? hex(STATUS_META[item.st].color)
            : "16211B",
        valign: "middle",
      });
      cx += colsW[ci];
    });
  });

  if (opts.includeNotes) {
    const notes = [
      page.title || "Timeline Project",
      `${el === "en" ? "Overall" : "Total"}: ${model.overall ?? 0}%`,
      `Done: ${model.counts.done}, In Progress: ${model.counts.inprogress}, At Risk: ${model.counts.atrisk}, Not Started: ${model.counts.notstarted}`,
    ];
    slide.addNotes(notes.join("\n"));
  }
}

function buildSlideNotes(
  page: PageData,
  model: TimelineModel,
  chunk: ModelItem[],
  partIdx: number,
  totalParts: number,
  el: "id" | "en"
): string {
  const lines: string[] = [
    `${page.title || "Timeline Project"}${totalParts > 1 ? ` (${partIdx + 1}/${totalParts})` : ""}`,
  ];
  if (model.td) {
    lines.push(`${el === "en" ? "Data as of" : "Data per"}: ${fmtD(model.td, el)}`);
  }
  if (model.overall != null) {
    lines.push(
      `${el === "en" ? "Overall" : "Total"}: ${model.overall}% · Done: ${model.counts.done}, In Progress: ${model.counts.inprogress}, At Risk: ${model.counts.atrisk}, Not Started: ${model.counts.notstarted}`
    );
  }
  lines.push("");
  chunk.forEach((it) => {
    if (it.kind === "group") {
      lines.push(`■ ${it.row.name}${it.prog != null ? ` (${it.prog}%)` : ""}`);
    } else {
      const sched = it.bd ? `${formatRangeLabel(it.bd, el)} (${it.hk} ${el === "en" ? "WD" : "HK"})` : "—";
      lines.push(
        `  • ${it.row.name}: ${sched} · ${translate(el, `st.${it.st}.label`)} · ${it.prog}%${it.ms ? " · Milestone" : ""}`
      );
    }
  });
  return lines.join("\n");
}

export async function exportProjectToPptx(
  project: ProjectData,
  opts: ExportOptions
): Promise<void> {
  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_WIDE";
  pres.title = project.name || "Timeline Project";
  pres.author = "Timeline Builder Pro";

  const styleDef = SLIDE_STYLE_DEFS[opts.style] || SLIDE_STYLE_DEFS.standar;
  const pages = project.pages.filter((p) => opts.pageIds.includes(p.id));
  const targetPages = pages.length > 0 ? pages : [project.pages[0]];

  for (const page of targetPages) {
    const model = buildTimelineModel(page, project.mode as ScaleMode, opts.lang);
    const allRows = styleDef.execRollup
      ? filterExecRows(model.visibleRows)
      : model.visibleRows;

    if (opts.includeSummary) {
      addSummarySlide(pres, page, model, opts);
    }

    const face = opts.font;
    const acc = hex(page.accent);
    const legY = 0.98;
    const showLeg = opts.showLegend && page.showLegend;
    const gridTop = showLeg ? 1.32 : 1.04;
    const hdrH = model.mode === "month" ? 0.34 : 0.5;
    const railReserve = opts.showRail && page.msRail && model.railMarks.length > 0 ? 0.68 : 0.28;
    const maxBodyH = PH - gridTop - hdrH - railReserve - 0.15;

    const rowH = Math.min(styleDef.rowMaxH, Math.max(0.24, maxBodyH / Math.max(1, Math.min(allRows.length, 14))));
    const rowsPerSlide = Math.max(4, Math.floor(maxBodyH / rowH));

    const chunks: ModelItem[][] = [];
    if (allRows.length === 0) {
      chunks.push([]);
    } else {
      for (let i = 0; i < allRows.length; i += rowsPerSlide) {
        chunks.push(allRows.slice(i, i + rowsPerSlide));
      }
    }

    // Column widths in inches
    const totalW = PW - 2 * MX;
    const wTask = opts.showDuration || opts.showStatus || opts.showOwner ? 2.55 : 3.2;
    const wOwner = opts.showOwner ? 0.95 : 0;
    const wDur = opts.showDuration ? 1.45 : 0;
    const wStat = opts.showStatus ? 1.0 : 0;
    const fixedW = wTask + wOwner + wDur + wStat;
    const timelineW = Math.max(3.5, totalW - fixedW);
    const colWIn = model.cols.length > 0 ? timelineW / model.cols.length : timelineW;
    const gridX = MX + fixedW;

    chunks.forEach((chunk, ci) => {
      const slide = pres.addSlide();
      const partSuffix =
        chunks.length > 1
          ? ` (${ci + 1}/${chunks.length})`
          : "";
      addSlideHeader(pres, slide, page, opts, partSuffix);

      // Legend
      if (showLeg) {
        let lx = MX;
        const statuses: ("done" | "inprogress" | "atrisk" | "notstarted")[] = [
          "done",
          "inprogress",
          "atrisk",
          "notstarted",
        ];
        statuses.forEach((st) => {
          slide.addShape(pres.ShapeType.ellipse, {
            x: lx,
            y: legY + 0.06,
            w: 0.1,
            h: 0.1,
            fill: { color: hex(STATUS_META[st].color) },
            line: { color: hex(STATUS_META[st].color), width: 0 },
          });
          const lbl = translate(opts.lang, `st.${st}.label`);
          const lw = Math.min(1.8, lbl.length * 0.075 + 0.2);
          slide.addText(lbl, {
            x: lx + 0.13,
            y: legY,
            w: lw,
            h: 0.22,
            fontFace: face,
            fontSize: 8.5,
            color: "3A4841",
            valign: "middle",
          });
          lx += lw + 0.22;
        });

        if (model.overall != null) {
          slide.addText(
            `${opts.lang === "en" ? "Overall" : "Total"}: ${model.overall}%`,
            {
              x: PW - MX - 1.5,
              y: legY,
              w: 1.5,
              h: 0.22,
              fontFace: face,
              fontSize: 9,
              bold: true,
              color: acc,
              align: "right",
              valign: "middle",
            }
          );
        }
      }

      // Table Header
      const headerCols: { label: string; x: number; w: number }[] = [
        { label: "TASK", x: MX, w: wTask },
      ];
      let hx = MX + wTask;
      if (opts.showOwner) {
        headerCols.push({ label: "PIC", x: hx, w: wOwner });
        hx += wOwner;
      }
      if (opts.showDuration) {
        headerCols.push({
          label: opts.lang === "en" ? "DURATION" : "DURASI",
          x: hx,
          w: wDur,
        });
        hx += wDur;
      }
      if (opts.showStatus) {
        headerCols.push({ label: "STATUS", x: hx, w: wStat });
      }

      headerCols.forEach((hc) => {
        slide.addShape(pres.ShapeType.rect, {
          x: hc.x,
          y: gridTop,
          w: hc.w,
          h: hdrH,
          fill: { color: acc },
          line: { color: "FFFFFF", width: 0.5 },
        });
        slide.addText(hc.label, {
          x: hc.x + 0.06,
          y: gridTop,
          w: hc.w - 0.12,
          h: hdrH,
          fontFace: face,
          fontSize: styleDef.fontMin,
          bold: true,
          color: "FFFFFF",
          align: hc.label === "TASK" ? "left" : "center",
          valign: "middle",
        });
      });

      // Timeline Month + Sub-column Headers
      if (model.mode !== "month") {
        model.monthGroups.forEach((mg) => {
          const mx = gridX + mg.i0 * colWIn;
          const mw = mg.n * colWIn;
          slide.addShape(pres.ShapeType.rect, {
            x: mx,
            y: gridTop,
            w: mw,
            h: 0.26,
            fill: { color: acc },
            line: { color: "FFFFFF", width: 0.5 },
          });
          slide.addText(mg.label, {
            x: mx + 0.02,
            y: gridTop,
            w: mw - 0.04,
            h: 0.26,
            fontFace: face,
            fontSize: 8.5,
            bold: true,
            color: "FFFFFF",
            align: "center",
            valign: "middle",
          });
        });

        model.cols.forEach((col, cIdx) => {
          const cx = gridX + cIdx * colWIn;
          slide.addShape(pres.ShapeType.rect, {
            x: cx,
            y: gridTop + 0.26,
            w: colWIn,
            h: hdrH - 0.26,
            fill: { color: col.hasHoliday ? "FEF2F2" : "F7FAF8" },
            line: { color: "E2E8E4", width: 0.5 },
          });
          slide.addText(col.label, {
            x: cx,
            y: gridTop + 0.26,
            w: colWIn,
            h: hdrH - 0.26,
            fontFace: face,
            fontSize: 7.5,
            bold: true,
            color: col.hasHoliday ? "C62828" : "3A4841",
            align: "center",
            valign: "middle",
          });
        });
      } else {
        model.cols.forEach((col, cIdx) => {
          const cx = gridX + cIdx * colWIn;
          slide.addShape(pres.ShapeType.rect, {
            x: cx,
            y: gridTop,
            w: colWIn,
            h: hdrH,
            fill: { color: acc },
            line: { color: "FFFFFF", width: 0.5 },
          });
          slide.addText(col.label, {
            x: cx,
            y: gridTop,
            w: colWIn,
            h: hdrH,
            fontFace: face,
            fontSize: 8.5,
            bold: true,
            color: "FFFFFF",
            align: "center",
            valign: "middle",
          });
        });
      }

      const bodyY = gridTop + hdrH;
      const bodyH = Math.max(1, chunk.length) * rowH;

      // Vertical Grid Lines
      model.cols.forEach((col, cIdx) => {
        const cx = gridX + cIdx * colWIn;
        slide.addShape(pres.ShapeType.rect, {
          x: cx,
          y: bodyY,
          w: colWIn,
          h: bodyH,
          fill: { color: col.hasHoliday ? "FFF8F8" : "FFFFFF" },
          line: { color: "EEF2EF", width: 0.5 },
        });
      });

      // Track row Y centers for dependency arrows
      const rowYMap = new Map<string, number>();

      // Rows
      chunk.forEach((it, rIdx) => {
        const ry = bodyY + rIdx * rowH;
        rowYMap.set(it.row.id, ry + rowH / 2);

        if (it.kind === "group") {
          slide.addShape(pres.ShapeType.rect, {
            x: MX,
            y: ry,
            w: totalW,
            h: rowH,
            fill: { color: "F2F7F4" },
            line: { color: "E2E8E4", width: 0.5 },
          });
          slide.addText(it.row.name, {
            x: MX + 0.08,
            y: ry,
            w: wTask - 0.16,
            h: rowH,
            fontFace: face,
            fontSize: Math.min(styleDef.fontMax, 9.5),
            bold: true,
            color: "0B4622",
            valign: "middle",
          });
          if (opts.showStatus && it.prog != null) {
            slide.addText(`${it.prog}%`, {
              x: gridX - wStat,
              y: ry,
              w: wStat,
              h: rowH,
              fontFace: face,
              fontSize: 8.5,
              bold: true,
              color: acc,
              align: "center",
              valign: "middle",
            });
          }
          if (page.groupRollup && it.u0 != null && it.u1 != null && it.u1 > it.u0) {
            const bx = gridX + it.u0 * colWIn;
            const bw = Math.max(0.08, (it.u1 - it.u0) * colWIn);
            slide.addShape(pres.ShapeType.roundRect, {
              x: bx,
              y: ry + rowH / 2 - 0.05,
              w: bw,
              h: 0.1,
              fill: { color: acc },
              line: { color: acc, width: 0 },
              rectRadius: 0.05,
            });
          }
          return;
        }

        // Task row
        const rowBg = it.last ? "FFFBEB" : rIdx % 2 === 1 ? "FAFBF9" : "FFFFFF";
        slide.addShape(pres.ShapeType.rect, {
          x: MX,
          y: ry,
          w: fixedW,
          h: rowH,
          fill: { color: rowBg },
          line: { color: "EEF2EF", width: 0.5 },
        });

        let cx = MX;
        slide.addText(
          `${it.ms ? (it.last ? "★ " : "◆ ") : ""}${it.row.name}`,
          {
            x: cx + 0.08,
            y: ry,
            w: wTask - 0.14,
            h: rowH,
            fontFace: face,
            fontSize: Math.min(styleDef.fontMax, 9),
            color: "16211B",
            valign: "middle",
          }
        );
        cx += wTask;

        if (opts.showOwner) {
          slide.addText(it.row.owner || "—", {
            x: cx + 0.05,
            y: ry,
            w: wOwner - 0.1,
            h: rowH,
            fontFace: face,
            fontSize: 8.5,
            color: "3A4841",
            align: "center",
            valign: "middle",
          });
          cx += wOwner;
        }

        if (opts.showDuration) {
          const dLabel = it.bd
            ? `${formatRangeLabel(it.bd, opts.lang)}${it.hk > 0 ? ` (${it.hk})` : ""}`
            : "—";
          slide.addText(dLabel, {
            x: cx + 0.04,
            y: ry,
            w: wDur - 0.08,
            h: rowH,
            fontFace: face,
            fontSize: 8,
            color: "3A4841",
            align: "center",
            valign: "middle",
          });
          cx += wDur;
        }

        if (opts.showStatus) {
          slide.addText(`${it.prog}%`, {
            x: cx + 0.04,
            y: ry,
            w: wStat - 0.08,
            h: rowH,
            fontFace: face,
            fontSize: 8.5,
            bold: true,
            color: hex(STATUS_META[it.st].color),
            align: "center",
            valign: "middle",
          });
        }

        // Task Bar (native roundRect shapes)
        if (it.u0 != null && it.u1 != null) {
          const stHex = hex(STATUS_META[it.st].color);
          const trkHex = mixHex(STATUS_META[it.st].color, 0.8);
          const bx = gridX + it.u0 * colWIn;
          const bw = Math.max(0.1, (it.u1 - it.u0) * colWIn);
          const bh = styleDef.barH;
          const by = ry + (rowH - bh) / 2;

          slide.addShape(pres.ShapeType.roundRect, {
            x: bx,
            y: by,
            w: bw,
            h: bh,
            fill: { color: trkHex },
            line: { color: trkHex, width: 0 },
            rectRadius: bh / 2,
          });

          if (it.prog > 0) {
            const fw = Math.max(0.06, bw * (it.prog / 100));
            slide.addShape(pres.ShapeType.roundRect, {
              x: bx,
              y: by,
              w: fw,
              h: bh,
              fill: { color: stHex },
              line: { color: stHex, width: 0 },
              rectRadius: bh / 2,
            });
          }

          if (it.ms) {
            const msSize = it.last ? 0.2 : 0.16;
            slide.addShape(
              it.last ? pres.ShapeType.star5 : pres.ShapeType.diamond,
              {
                x: bx + bw - msSize / 2,
                y: ry + rowH / 2 - msSize / 2,
                w: msSize,
                h: msSize,
                fill: { color: it.last ? "FFB300" : stHex },
                line: { color: "FFFFFF", width: 0.75 },
              }
            );
          }
        }
      });

      // Dependency Connectors (native lines + triangles)
      if (opts.showDeps && page.showDeps) {
        const edges = collectDepEdges(page);
        edges.forEach((edge) => {
          const fromIt = model.byId.get(edge.fromId);
          const toIt = model.byId.get(edge.toId);
          const y1 = rowYMap.get(edge.fromId);
          const y2 = rowYMap.get(edge.toId);
          if (
            !fromIt ||
            !toIt ||
            fromIt.kind !== "task" ||
            toIt.kind !== "task" ||
            y1 == null ||
            y2 == null ||
            fromIt.u0 == null ||
            fromIt.u1 == null ||
            toIt.u0 == null ||
            toIt.u1 == null
          ) {
            return;
          }
          const x1 =
            gridX +
            (edge.type === "SS" || edge.type === "SF" ? fromIt.u0 : fromIt.u1) *
              colWIn;
          const x2 =
            gridX +
            (edge.type === "FF" || edge.type === "SF" ? toIt.u1 : toIt.u0) *
              colWIn;
          const colHex = edge.conflict ? "E53935" : hex(page.depColor);
          const midX = (x1 + x2) / 2;

          // 3-segment orthogonal connector using native lines
          slide.addShape(pres.ShapeType.line, {
            x: Math.min(x1, midX),
            y: y1,
            w: Math.abs(midX - x1),
            h: 0,
            line: { color: colHex, width: 1 },
          });
          slide.addShape(pres.ShapeType.line, {
            x: midX,
            y: Math.min(y1, y2),
            w: 0,
            h: Math.abs(y2 - y1),
            line: { color: colHex, width: 1 },
          });
          slide.addShape(pres.ShapeType.line, {
            x: Math.min(midX, x2),
            y: y2,
            w: Math.abs(x2 - midX),
            h: 0,
            line: { color: colHex, width: 1, endArrowType: "triangle" },
          });
        });
      }

      // Today Vertical Dashed Line
      if (opts.showToday && page.showToday && model.tu != null) {
        const tx = gridX + model.tu * colWIn;
        slide.addShape(pres.ShapeType.line, {
          x: tx,
          y: bodyY,
          w: 0,
          h: bodyH,
          line: { color: "1F2A24", width: 1.25, dashType: "dash" },
        });
      }

      // Milestone Rail
      if (opts.showRail && page.msRail && model.railMarks.length > 0) {
        const railY = bodyY + bodyH + 0.14;
        slide.addShape(pres.ShapeType.line, {
          x: gridX,
          y: railY,
          w: timelineW,
          h: 0,
          line: { color: "C9D3CD", width: 1, dashType: "dash" },
        });
        model.railMarks.forEach((m) => {
          const mx = gridX + m.u * colWIn;
          slide.addShape(pres.ShapeType.diamond, {
            x: mx - 0.05,
            y: railY - 0.05,
            w: 0.1,
            h: 0.1,
            fill: {
              color:
                m.kind === "now"
                  ? "1F2A24"
                  : m.last
                    ? "E09200"
                    : acc,
            },
            line: { color: "FFFFFF", width: 0.5 },
          });
          slide.addText(`${m.date}\n${m.name}`, {
            x: mx - 0.5,
            y: railY + 0.07,
            w: 1.0,
            h: 0.38,
            fontFace: face,
            fontSize: 7,
            color: "3A4841",
            align: "center",
            valign: "top",
          });
        });
      }

      // Speaker Notes
      if (opts.includeNotes) {
        slide.addNotes(
          buildSlideNotes(page, model, chunk, ci, chunks.length, opts.lang)
        );
      }
    });
  }

  const safeName = (project.name || "timeline-project")
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-");
  await pres.writeFile({ fileName: `${safeName}.pptx` });
}
