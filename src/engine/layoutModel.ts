import { translate } from "@/constants/i18n";
import {
  barDates,
  clamp,
  colWidth,
  countHK,
  fmtDM,
  getColumns,
  makeCalendarContext,
  monthGroups,
  monthIndex,
  monthName,
  parseISO,
  uAt,
  weekEnd,
  weekStart,
  type BarDates,
  type MonthGroup,
  type TimelineCol,
} from "@/engine/calendar";
import { autoStat, effStat } from "@/engine/status";
import type {
  LangCode,
  PageData,
  ScaleMode,
  StatusKey,
  TimelineRow,
} from "@/types/timeline";

export interface GroupItem {
  kind: "group";
  row: TimelineRow;
  idx: number;
  kids: TaskItem[];
  n: number;
  prog: number | null;
  sd?: Date;
  ed?: Date;
  u0?: number;
  u1?: number;
}

export interface TaskItem {
  kind: "task";
  row: TimelineRow;
  idx: number;
  group: GroupItem | null;
  bd: BarDates | null;
  ms: boolean;
  last?: boolean;
  st: StatusKey;
  auto: boolean;
  prog: number;
  hk: number;
  u0?: number;
  u1?: number;
  cl?: boolean;
  cr?: boolean;
}

export type ModelItem = GroupItem | TaskItem;

export interface RailMark {
  kind: "ms" | "now";
  u: number;
  name: string;
  date: string;
  last?: boolean;
  st?: StatusKey;
}

export interface TimelineModel {
  page: PageData;
  mode: ScaleMode;
  cols: TimelineCol[];
  monthGroups: MonthGroup[];
  colW: number;
  items: ModelItem[];
  visibleRows: ModelItem[];
  tasks: TaskItem[];
  byId: Map<string, ModelItem>;
  counts: Record<StatusKey, number>;
  overall: number | null;
  msCount: number;
  td: Date | null;
  tu: number | null;
  tuKind: "today" | "week" | null;
  cp: TimelineCol | null;
  multiYear: boolean;
  railMarks: RailMark[];
}

export function buildTimelineModel(
  page: PageData,
  mode: ScaleMode,
  lang: LangCode = "id"
): TimelineModel {
  const ctx = makeCalendarContext(page);
  const cols = getColumns(ctx, mode, lang);
  const N = cols.length;
  const colW = colWidth(page, mode);
  const mGroups = monthGroups(cols, lang);
  const years = new Set(cols.map((c) => c.year));
  const multiYear = years.size > 1;

  const items: ModelItem[] = [];
  const tasks: TaskItem[] = [];
  const byId = new Map<string, ModelItem>();
  let curGroup: GroupItem | null = null;

  const placeItem = (it: { bd?: BarDates | null; sd?: Date; ed?: Date; u0?: number; u1?: number; cl?: boolean; cr?: boolean }) => {
    const sd = it.bd ? it.bd.sd : it.sd;
    const ed = it.bd ? it.bd.ed : it.ed;
    if (!sd || !ed || !N) return;
    it.u0 = uAt(cols, sd, false);
    it.u1 = uAt(cols, ed, true);
    it.cl = sd < cols[0].ds;
    it.cr = ed > cols[N - 1].de;
  };

  page.rows.forEach((row, idx) => {
    if (row.type === "group") {
      const grp: GroupItem = {
        kind: "group",
        row,
        idx,
        kids: [],
        n: 0,
        prog: null,
      };
      curGroup = grp;
      items.push(grp);
      byId.set(row.id, grp);
    } else {
      const b = row.bar;
      const bd = barDates(page, b);
      const prog = b ? clamp(Number(b.progress) || 0, 0, 100) : 0;
      const task: TaskItem = {
        kind: "task",
        row,
        idx,
        group: curGroup,
        bd,
        ms: Boolean(b?.ms),
        st: effStat(page, b),
        auto: Boolean(b && autoStat(page, b)),
        prog,
        hk: bd ? countHK(ctx, bd.sd, bd.ed) : 0,
      };
      placeItem(task);
      if (curGroup) {
        curGroup.kids.push(task);
        curGroup.n++;
      }
      items.push(task);
      tasks.push(task);
      byId.set(row.id, task);
    }
  });

  // Group rollups
  items.forEach((it) => {
    if (it.kind !== "group" || it.kids.length === 0) return;
    const totalProg = it.kids.reduce((s, k) => s + k.prog, 0);
    it.prog = Math.round(totalProg / it.kids.length);
    const datedKids = it.kids.filter((k) => k.bd);
    if (datedKids.length > 0) {
      it.sd = new Date(
        Math.min(...datedKids.map((k) => k.bd!.sd.getTime()))
      );
      it.ed = new Date(
        Math.max(...datedKids.map((k) => k.bd!.ed.getTime()))
      );
      placeItem(it);
    }
  });

  // Last milestone
  const msTasks = tasks.filter((t) => t.ms && t.bd);
  if (msTasks.length > 0) {
    let latest = msTasks[0];
    msTasks.forEach((t) => {
      if (t.bd!.ed >= latest.bd!.ed) latest = t;
    });
    latest.last = true;
  }

  // Visible rows (respect collapsed groups)
  const visibleRows: ModelItem[] = [];
  items.forEach((it) => {
    if (it.kind === "group") {
      visibleRows.push(it);
    } else if (!it.group || !it.group.row.collapsed) {
      visibleRows.push(it);
    }
  });

  // Counts & overall
  const counts: Record<StatusKey, number> = {
    done: 0,
    inprogress: 0,
    atrisk: 0,
    notstarted: 0,
  };
  tasks.forEach((t) => {
    counts[t.st]++;
  });
  const overall =
    tasks.length > 0
      ? Math.round(tasks.reduce((s, t) => s + t.prog, 0) / tasks.length)
      : null;

  // Today / current week marker
  const td = parseISO(page.today);
  let tu: number | null = null;
  let tuKind: "today" | "week" | null = null;
  let cp: TimelineCol | null = null;

  if (N > 0) {
    if (td && td >= cols[0].ds && td <= cols[N - 1].de) {
      tu = uAt(cols, td, false) + 0.5 / Math.max(1, cols[Math.min(N - 1, Math.floor(uAt(cols, td, false)))]?.days || 1);
      tuKind = "today";
    } else if (page.cm && page.cw) {
      const ws = weekStart(page.cm, page.cy || page.year, page.cw);
      const we = weekEnd(page.cm, page.cy || page.year, page.cw);
      if (we >= cols[0].ds && ws <= cols[N - 1].de) {
        const uStart = uAt(cols, ws, false);
        const uEnd = uAt(cols, we, true);
        tu = (uStart + uEnd) / 2;
        tuKind = "week";
        cp = cols.find((c) => c.ds <= we && c.de >= ws) || null;
      }
    }
  }

  // Milestone rail marks
  const railMarks: RailMark[] = [];
  const yrSuffix = (y: number) => (multiYear ? ` ${y}` : "");
  tasks
    .filter((t) => t.ms && t.bd && t.u1 != null)
    .forEach((t) => {
      railMarks.push({
        kind: "ms",
        u: t.u1!,
        name: t.row.name,
        date: fmtDM(t.bd!.ed, lang) + yrSuffix(t.bd!.ey),
        last: t.last,
        st: t.st,
      });
    });

  if (page.showToday && tu != null) {
    const labelDate =
      tuKind === "today" && td
        ? fmtDM(td, lang) + yrSuffix(td.getFullYear())
        : `W${page.cw} ${monthName(monthIndex(page.cm), lang, true)}${yrSuffix(page.cy)}`;
    railMarks.push({
      kind: "now",
      u: tu,
      name:
        tuKind === "today"
          ? translate(lang, "core.today")
          : lang === "en"
            ? "This week"
            : "Minggu ini",
      date: labelDate,
    });
  }
  railMarks.sort((a, b) => a.u - b.u);

  return {
    page,
    mode,
    cols,
    monthGroups: mGroups,
    colW,
    items,
    visibleRows,
    tasks,
    byId,
    counts,
    overall,
    msCount: msTasks.length,
    td,
    tu,
    tuKind,
    cp,
    multiYear,
    railMarks,
  };
}
