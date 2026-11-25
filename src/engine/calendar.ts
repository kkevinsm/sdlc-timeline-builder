import {
  MONTH_NAMES_EN,
  MONTH_NAMES_ID,
  MONTH_SHORT_EN,
  MONTH_SHORT_ID,
  WD_DEF,
} from "@/constants/theme";
import type {
  LangCode,
  PageData,
  ScaleMode,
  TaskBar,
} from "@/types/timeline";

export interface TimelineCol {
  mIdx: number;
  mo: number;
  month: string;
  year: number;
  kind: "day" | "3day" | "week" | "2week" | "month";
  label: string;
  subLabel?: string;
  ds: Date;
  de: Date;
  days: number;
  week?: number;
  off?: boolean;
  hasHoliday?: boolean;
  holidayNames?: string[];
  gaps?: [Date, Date][];
}

export interface MonthGroup {
  mIdx: number;
  name: string;
  label: string;
  year: number;
  mo: number;
  i0: number;
  n: number;
}

export interface BarDates {
  sd: Date;
  ed: Date;
  sm: string;
  sw: number;
  sy: number;
  em: string;
  ew: number;
  ey: number;
  exact?: boolean;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function monthIndex(name: string): number {
  const i = MONTH_NAMES_ID.indexOf(name as (typeof MONTH_NAMES_ID)[number]);
  if (i >= 0) return i;
  const j = MONTH_NAMES_EN.indexOf(name as (typeof MONTH_NAMES_EN)[number]);
  return j >= 0 ? j : 0;
}

export function monthName(
  mo: number,
  lang: LangCode = "id",
  short = false
): string {
  const idx = ((mo % 12) + 12) % 12;
  if (short) return lang === "en" ? MONTH_SHORT_EN[idx] : MONTH_SHORT_ID[idx];
  return lang === "en" ? MONTH_NAMES_EN[idx] : MONTH_NAMES_ID[idx];
}

export function parseISO(iso?: string): Date | null {
  if (!iso || typeof iso !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d)
    return null;
  return dt;
}

export function fmtISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function dayDiff(b: Date, a: Date): number {
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / 86400000);
}

export function weekOf(d: Date): number {
  const day = d.getDate();
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  if (day <= 28) return 4;
  return 5;
}

export function weekStart(month: string, year: number, w: number): Date {
  const mo = monthIndex(month);
  const days = new Date(year, mo + 1, 0).getDate();
  const startDay = Math.min((w - 1) * 7 + 1, days);
  return new Date(year, mo, startDay);
}

export function weekEnd(month: string, year: number, w: number): Date {
  const mo = monthIndex(month);
  const days = new Date(year, mo + 1, 0).getDate();
  const endDay = w >= 5 ? days : Math.min(w * 7, days);
  return new Date(year, mo, endDay);
}

export interface CalendarContext {
  page: PageData;
  wdSet: Set<number>;
  holMap: Map<string, string[]>;
}

export function makeCalendarContext(page: PageData): CalendarContext {
  const wdList =
    Array.isArray(page.workDays) && page.workDays.length > 0
      ? page.workDays
      : [...WD_DEF];
  const wdSet = new Set(wdList);
  const holMap = new Map<string, string[]>();
  for (const h of page.holidays || []) {
    if (!h?.date) continue;
    const arr = holMap.get(h.date) || [];
    arr.push(h.name || "Libur");
    holMap.set(h.date, arr);
  }
  return { page, wdSet, holMap };
}

export function isWorkingDay(ctx: CalendarContext, d: Date): boolean {
  if (!ctx.wdSet.has(d.getDay())) return false;
  return !ctx.holMap.has(fmtISO(d));
}

export function countHK(ctx: CalendarContext, s: Date, e: Date): number {
  if (!s || !e || s > e) return 0;
  let c = 0;
  for (let x = new Date(s); x <= e; x = addDays(x, 1)) {
    if (isWorkingDay(ctx, x)) c++;
  }
  return c;
}

export function addHK(ctx: CalendarContext, s: Date, hk: number): Date {
  const target = clamp(hk, 1, 3000);
  let c = new Date(s);
  let n = isWorkingDay(ctx, c) ? 1 : 0;
  while (n < target) {
    c = addDays(c, 1);
    if (isWorkingDay(ctx, c)) n++;
  }
  return c;
}

export function nextWD(ctx: CalendarContext, d: Date): Date {
  let c = new Date(d);
  let guard = 0;
  while (!isWorkingDay(ctx, c) && guard++ < 60) c = addDays(c, 1);
  return c;
}

export function prevWD(ctx: CalendarContext, d: Date): Date {
  let c = new Date(d);
  let guard = 0;
  while (!isWorkingDay(ctx, c) && guard++ < 60) c = addDays(c, -1);
  return c;
}

export function barDates(page: PageData, b?: TaskBar | null): BarDates | null {
  if (!b) return null;
  if (b.sd) {
    const sd = parseISO(b.sd);
    const e0 = parseISO(b.ed || b.sd);
    if (sd) {
      const ed = e0 && e0 >= sd ? e0 : sd;
      return {
        sd,
        ed,
        sm: monthName(sd.getMonth(), "id"),
        sw: weekOf(sd),
        sy: sd.getFullYear(),
        em: monthName(ed.getMonth(), "id"),
        ew: weekOf(ed),
        ey: ed.getFullYear(),
        exact: true,
      };
    }
  }
  if (!b.startMonth || !b.startWeek) return null;
  const sy = b.startYear || page.year || new Date().getFullYear();
  let ey = b.endYear || sy;
  let em = b.endMonth || b.startMonth;
  let ew = b.endWeek || b.startWeek;
  const sd = weekStart(b.startMonth, sy, b.startWeek);
  let ed = weekEnd(em, ey, ew);
  if (ed < sd) {
    em = b.startMonth;
    ew = b.startWeek;
    ey = sy;
    ed = weekEnd(em, ey, ew);
  }
  return {
    sd,
    ed,
    sm: b.startMonth,
    sw: b.startWeek,
    sy,
    em,
    ew,
    ey,
  };
}

export function fmtD(d: Date, lang: LangCode = "id"): string {
  return `${d.getDate()} ${monthName(d.getMonth(), lang, true)} ${d.getFullYear()}`;
}

export function fmtDM(d: Date, lang: LangCode = "id"): string {
  return `${d.getDate()} ${monthName(d.getMonth(), lang, true)}`;
}

export function formatRangeLabel(bd: BarDates | null, lang: LangCode = "id"): string {
  if (!bd) return "";
  if (bd.exact) {
    if (bd.sd.getFullYear() !== bd.ed.getFullYear()) {
      return `${fmtD(bd.sd, lang)} – ${fmtD(bd.ed, lang)}`;
    }
    if (
      bd.sd.getMonth() === bd.ed.getMonth() &&
      bd.sd.getDate() === bd.ed.getDate()
    ) {
      return fmtDM(bd.sd, lang);
    }
    return `${fmtDM(bd.sd, lang)} – ${fmtDM(bd.ed, lang)}`;
  }
  const sm = monthName(monthIndex(bd.sm), lang, true);
  const em = monthName(monthIndex(bd.em), lang, true);
  if (bd.sm === bd.em && bd.sy === bd.ey) {
    return bd.sw === bd.ew
      ? `${sm} W${bd.sw}`
      : `${sm} W${bd.sw}–W${bd.ew}`;
  }
  return `${sm} W${bd.sw} – ${em} W${bd.ew}`;
}

export function colWidth(page: PageData, mode: ScaleMode): number {
  const w = Number(page.ww) || 44;
  if (mode === "month") return Math.round(w * 2.2);
  if (mode === "2week") return Math.round(w * 1.3);
  if (mode === "day") return Math.max(22, Math.round(w * 0.55));
  if (mode === "3day") return Math.max(34, Math.round(w * 0.85));
  return w;
}

export function getColumns(
  ctx: CalendarContext,
  mode: ScaleMode,
  lang: LangCode = "id"
): TimelineCol[] {
  const cols: TimelineCol[] = [];
  ctx.page.months.forEach((m, mIdx) => {
    const yr = Number(m.year) || Number(ctx.page.year) || 2026;
    const mo = monthIndex(m.name);
    const hidden = new Set(m.hiddenWeeks || []);
    const visibleWeeks = [...m.weeks]
      .filter((w) => !hidden.has(w))
      .sort((a, b) => a - b);
    if (visibleWeeks.length === 0) return;

    const spans: [Date, Date][] = visibleWeeks.map((w) => [
      weekStart(m.name, yr, w),
      weekEnd(m.name, yr, w),
    ]);

    if (mode === "day" || mode === "3day") {
      const sp = mode === "3day" ? 3 : 1;
      const runs: [Date, Date][] = [];
      spans.forEach(([a, b]) => {
        const last = runs[runs.length - 1];
        if (last && dayDiff(a, last[1]) === 1) last[1] = b;
        else runs.push([a, b]);
      });
      runs.forEach(([ra, rb]) => {
        for (let d = ra.getDate(); d <= rb.getDate(); d += sp) {
          const e = Math.min(d + sp - 1, rb.getDate());
          const ds = new Date(yr, mo, d);
          const de = new Date(yr, mo, e);
          let allOff = true;
          const holNames: string[] = [];
          for (let x = d; x <= e; x++) {
            const dt = new Date(yr, mo, x);
            if (isWorkingDay(ctx, dt)) allOff = false;
            const h = ctx.holMap.get(fmtISO(dt));
            if (h) holNames.push(...h);
          }
          cols.push({
            mIdx,
            mo,
            month: m.name,
            year: yr,
            kind: mode,
            label: mode === "day" ? String(d) : e > d ? `${d}–${e}` : String(d),
            subLabel: mode === "day" ? undefined : undefined,
            ds,
            de,
            days: e - d + 1,
            week: weekOf(ds),
            off: allOff,
            hasHoliday: holNames.length > 0,
            holidayNames: holNames,
          });
        }
      });
    } else if (mode === "week") {
      visibleWeeks.forEach((w) => {
        const ds = weekStart(m.name, yr, w);
        const de = weekEnd(m.name, yr, w);
        cols.push({
          mIdx,
          mo,
          month: m.name,
          year: yr,
          kind: "week",
          label: `W${w}`,
          ds,
          de,
          days: dayDiff(de, ds) + 1,
          week: w,
        });
      });
    } else if (mode === "2week") {
      for (let i = 0; i < visibleWeeks.length; i += 2) {
        const w1 = visibleWeeks[i];
        const w2 = visibleWeeks[i + 1];
        const ds = weekStart(m.name, yr, w1);
        const de = weekEnd(m.name, yr, w2 ?? w1);
        const gaps: [Date, Date][] = [];
        if (w2 && w2 - w1 > 1) {
          gaps.push([
            addDays(weekEnd(m.name, yr, w1), 1),
            addDays(weekStart(m.name, yr, w2), -1),
          ]);
        }
        const totalDays =
          dayDiff(weekEnd(m.name, yr, w1), ds) +
          1 +
          (w2 ? dayDiff(de, weekStart(m.name, yr, w2)) + 1 : 0);
        cols.push({
          mIdx,
          mo,
          month: m.name,
          year: yr,
          kind: "2week",
          label: w2 ? `W${w1}–${w2}` : `W${w1}`,
          ds,
          de,
          days: totalDays,
          gaps,
        });
      }
    } else {
      // month mode
      const ds = spans[0][0];
      const de = spans[spans.length - 1][1];
      let totalDays = 0;
      const gaps: [Date, Date][] = [];
      spans.forEach(([a, b], idx) => {
        totalDays += dayDiff(b, a) + 1;
        if (idx > 0 && dayDiff(a, spans[idx - 1][1]) > 1) {
          gaps.push([addDays(spans[idx - 1][1], 1), addDays(a, -1)]);
        }
      });
      cols.push({
        mIdx,
        mo,
        month: m.name,
        year: yr,
        kind: "month",
        label: monthName(mo, lang, true),
        ds,
        de,
        days: totalDays,
        gaps,
      });
    }
  });
  return cols;
}

function inGap(c: TimelineCol, d: Date): boolean {
  if (!c.gaps) return false;
  return c.gaps.some(([a, b]) => d >= a && d <= b);
}

function colOff(c: TimelineCol, d: Date): number {
  let off = 0;
  let cur = c.ds;
  for (const [ga, gb] of c.gaps || []) {
    if (d < ga) break;
    if (d <= gb) return off + dayDiff(ga, cur);
    off += dayDiff(ga, cur);
    cur = addDays(gb, 1);
  }
  return off + dayDiff(d, cur);
}

export function uAt(cols: TimelineCol[], d: Date, end: boolean): number {
  for (let i = 0; i < cols.length; i++) {
    const c = cols[i];
    if (d < c.ds) return i;
    if (d <= c.de) {
      return i + (colOff(c, d) + (end && !inGap(c, d) ? 1 : 0)) / c.days;
    }
  }
  return cols.length;
}

export function monthGroups(
  cols: TimelineCol[],
  lang: LangCode = "id"
): MonthGroup[] {
  const g: MonthGroup[] = [];
  cols.forEach((c, i) => {
    const last = g[g.length - 1];
    if (last && last.mIdx === c.mIdx) {
      last.n++;
    } else {
      g.push({
        mIdx: c.mIdx,
        name: c.month,
        label: `${monthName(c.mo, lang)} ${c.year}`,
        year: c.year,
        mo: c.mo,
        i0: i,
        n: 1,
      });
    }
  });
  return g;
}
