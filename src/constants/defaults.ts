import { getPresetHolidays } from "@/constants/holidays";
import {
  DEP_DEFAULT_COLOR,
  MONTH_NAMES_ID,
  SIZE_DEF,
  WD_DEF,
} from "@/constants/theme";
import { translate } from "@/constants/i18n";
import type { LangCode, MonthConfig, PageData, ProjectData } from "@/types/timeline";

export function weeksInMonth(year: number, monthIndex: number): number[] {
  const days = new Date(year, monthIndex + 1, 0).getDate();
  return days >= 29 ? [1, 2, 3, 4, 5] : [1, 2, 3, 4];
}

export function weekOfDate(d: Date): number {
  const day = d.getDate();
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  if (day <= 28) return 4;
  return 5;
}

export function createDefaultMonths(baseDate = new Date(), count = 6): MonthConfig[] {
  const list: MonthConfig[] = [];
  for (let i = 0; i < count; i++) {
    const dt = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
    const y = dt.getFullYear();
    const m = dt.getMonth();
    const name = MONTH_NAMES_ID[m];
    list.push({
      id: `${y}-${String(m + 1).padStart(2, "0")}`,
      name,
      year: y,
      weeks: weeksInMonth(y, m),
      hiddenWeeks: [],
    });
  }
  return list;
}

export function createDefaultPage(
  id: number,
  lang: LangCode = "id",
  name?: string
): PageData {
  const now = new Date();
  return {
    id,
    name: name || (id === 1 ? translate(lang, "pg.page1") : `${lang === "en" ? "Page" : "Halaman"} ${id}`),
    title: "Timeline Project",
    subtitle: "",
    tgt: "",
    tgtc: "#1B7A3E",
    logl: "",
    logr: "",
    logoL: "",
    logoR: "",
    loglc: "#F7941D",
    logrc: "#FF6600",
    cm: MONTH_NAMES_ID[now.getMonth()],
    cw: weekOfDate(now),
    cy: now.getFullYear(),
    today: "",
    year: now.getFullYear(),
    ...SIZE_DEF,
    autoStatus: true,
    atRiskThreshold: 10,
    showDeps: true,
    depColor: DEP_DEFAULT_COLOR,
    cascade: true,
    wdSnap: true,
    accent: "#1B7A3E",
    showToday: true,
    groupRollup: true,
    showLegend: true,
    showOwner: false,
    msRail: false,
    dateMode: "week",
    style: "standar",
    workDays: [...WD_DEF],
    months: createDefaultMonths(now, 6),
    rows: [],
    holidays: getPresetHolidays(now.getFullYear(), true),
  };
}

export function createDefaultProject(lang: LangCode = "id"): ProjectData {
  return {
    version: 3,
    name: "Timeline Project",
    mode: "week",
    zoom: 80,
    activePageId: 1,
    pages: [createDefaultPage(1, lang)],
  };
}
