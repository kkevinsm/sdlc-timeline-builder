import type { ModelItem, TaskItem } from "@/engine/layoutModel";
import type { SlideStyleId } from "@/types/timeline";

export interface ExportOptions {
  style: SlideStyleId;
  font: "Calibri" | "Arial" | "Segoe UI";
  lang: "id" | "en";
  includeSummary: boolean;
  includeNotes: boolean;
  showDuration: boolean;
  showStatus: boolean;
  showOwner: boolean;
  showDeps: boolean;
  showToday: boolean;
  showLegend: boolean;
  showRail: boolean;
  pageIds: number[];
}

export interface StyleDef {
  id: SlideStyleId;
  name: { id: string; en: string };
  desc: { id: string; en: string };
  defaults: Partial<ExportOptions>;
  execRollup?: boolean;
  barH: number;
  rowMaxH: number;
  fontMin: number;
  fontMax: number;
}

export const SLIDE_STYLE_DEFS: Record<SlideStyleId, StyleDef> = {
  standar: {
    id: "standar",
    name: { id: "Standar", en: "Standard" },
    desc: {
      id: "Tampilan lengkap sesuai pengaturan halaman editor.",
      en: "Full view matching your editor page settings.",
    },
    defaults: {
      showDuration: true,
      showStatus: true,
      showDeps: true,
      showToday: true,
      showLegend: true,
      showRail: true,
      includeNotes: true,
      includeSummary: false,
    },
    barH: 0.16,
    rowMaxH: 0.36,
    fontMin: 8,
    fontMax: 11,
  },
  simple: {
    id: "simple",
    name: { id: "Simple", en: "Simple" },
    desc: {
      id: "Minimalis tanpa kolom durasi, status, dan panah dependency.",
      en: "Minimalist layout without duration, status, or dependency arrows.",
    },
    defaults: {
      showDuration: false,
      showStatus: false,
      showOwner: false,
      showDeps: false,
      includeNotes: false,
      includeSummary: false,
    },
    barH: 0.14,
    rowMaxH: 0.34,
    fontMin: 8.5,
    fontMax: 11,
  },
  it: {
    id: "it",
    name: { id: "IT Implementation", en: "IT Implementation" },
    desc: {
      id: "Padat & teknis: durasi HK, PIC, status, dependency, dan notes.",
      en: "Dense technical view: working days, PIC, status, dependencies, and notes.",
    },
    defaults: {
      showDuration: true,
      showStatus: true,
      showOwner: true,
      showDeps: true,
      showToday: true,
      includeNotes: true,
      includeSummary: false,
    },
    barH: 0.14,
    rowMaxH: 0.3,
    fontMin: 7.5,
    fontMax: 10,
  },
  release: {
    id: "release",
    name: { id: "Release", en: "Release" },
    desc: {
      id: "Menonjolkan milestone rilis, dependency, dan rel tanggal.",
      en: "Highlights release milestones, dependencies, and milestone rail.",
    },
    defaults: {
      showDuration: false,
      showStatus: true,
      showOwner: false,
      showDeps: true,
      showToday: true,
      showRail: true,
      includeNotes: true,
      includeSummary: false,
    },
    barH: 0.16,
    rowMaxH: 0.4,
    fontMin: 8,
    fontMax: 11,
  },
  management: {
    id: "management",
    name: { id: "Management", en: "Management" },
    desc: {
      id: "Ringkasan eksekutif: group > 3 task diringkas, tampilkan Milestone & At Risk + Summary Slide.",
      en: "Executive rollup: summarizes groups > 3 tasks, highlights Milestones & At Risk + Summary Slide.",
    },
    defaults: {
      showDuration: false,
      showStatus: true,
      showOwner: false,
      showDeps: false,
      showToday: true,
      includeSummary: true,
      includeNotes: true,
    },
    execRollup: true,
    barH: 0.22,
    rowMaxH: 0.5,
    fontMin: 10,
    fontMax: 14,
  },
};

/**
 * Management style rollup: if a group has > 3 tasks, hide regular tasks
 * and only show tasks marked as Milestone or At Risk.
 */
export function filterExecRows(rows: ModelItem[]): ModelItem[] {
  const groupTaskCounts = new Map<string, number>();
  rows.forEach((it) => {
    if (it.kind === "task" && it.group) {
      groupTaskCounts.set(
        it.group.row.id,
        (groupTaskCounts.get(it.group.row.id) || 0) + 1
      );
    }
  });

  return rows.filter((it) => {
    if (it.kind === "group") return true;
    const t = it as TaskItem;
    if (!t.group) return true;
    const count = groupTaskCounts.get(t.group.row.id) || 0;
    if (count <= 3) return true;
    return t.ms || t.st === "atrisk";
  });
}
