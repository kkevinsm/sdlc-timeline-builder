import { translate } from "@/constants/i18n";
import { fmtISO, formatRangeLabel } from "@/engine/calendar";
import { buildTimelineModel } from "@/engine/layoutModel";
import type { LangCode, ProjectData } from "@/types/timeline";

function csvCell(val: string | number | boolean | null | undefined): string {
  const s = val == null ? "" : String(val);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Exports selected pages of a project to UTF-8 BOM CSV so Excel opens
 * Indonesian/Unicode text cleanly.
 */
export function exportProjectToCsv(
  project: ProjectData,
  pageIds: number[],
  lang: LangCode,
  fileName = "timeline.csv"
): void {
  const targetPages = project.pages.filter((p) => pageIds.includes(p.id));
  const pages = targetPages.length > 0 ? targetPages : project.pages;

  const headers =
    lang === "en"
      ? [
          "Slide",
          "Group",
          "Task",
          "PIC",
          "Period",
          "Start Date",
          "End Date",
          "Duration (WD)",
          "Progress (%)",
          "Status",
          "Milestone",
          "Dependencies",
          "Baseline End",
        ]
      : [
          "Halaman",
          "Grup",
          "Task",
          "PIC",
          "Periode",
          "Tanggal Mulai",
          "Tanggal Selesai",
          "Durasi (HK)",
          "Progress (%)",
          "Status",
          "Milestone",
          "Dependensi",
          "Target Baseline",
        ];

  const rows: string[] = [headers.map(csvCell).join(",")];

  for (const page of pages) {
    const model = buildTimelineModel(page, project.mode, lang);
    const byId = new Map(page.rows.map((r) => [r.id, r]));

    for (const item of model.items) {
      if (item.kind !== "task") continue;
      const deps = (item.row.deps || [])
        .map((d) => `[${d.type}] ${byId.get(d.id)?.name || d.id}`)
        .join("; ");
      const line = [
        page.name,
        item.group?.row.name || "",
        item.row.name,
        item.row.owner || "",
        item.bd ? formatRangeLabel(item.bd, lang) : "",
        item.bd ? fmtISO(item.bd.sd) : "",
        item.bd ? fmtISO(item.bd.ed) : "",
        item.hk,
        item.prog,
        translate(lang, `st.${item.st}.label`),
        item.ms ? (lang === "en" ? "Yes" : "Ya") : "",
        deps,
        item.baseBd ? fmtISO(item.baseBd.ed) : "",
      ];
      rows.push(line.map(csvCell).join(","));
    }
  }

  const csvContent = `\uFEFF${rows.join("\r\n")}`;
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
