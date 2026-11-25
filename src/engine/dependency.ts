import {
  addDays,
  addHK,
  barDates,
  countHK,
  dayDiff,
  fmtISO,
  monthName,
  nextWD,
  prevWD,
  weekOf,
  type BarDates,
} from "@/engine/calendar";
import { makeCalendarContext } from "@/engine/calendar";
import type { DepType, PageData, TimelineRow } from "@/types/timeline";

export function depBad(t: DepType, a: BarDates, b: BarDates): boolean {
  if (t === "SS") return b.sd < a.sd;
  if (t === "FF") return b.ed < a.ed;
  if (t === "SF") return b.ed < a.sd;
  return b.sd <= a.ed; // FS
}

export interface DepEdge {
  fromId: string;
  toId: string;
  type: DepType;
  conflict: boolean;
}

export function collectDepEdges(page: PageData): DepEdge[] {
  const byId = new Map<string, TimelineRow>();
  page.rows.forEach((r) => byId.set(r.id, r));
  const edges: DepEdge[] = [];
  for (const r of page.rows) {
    if (r.type !== "task" || !r.deps?.length) continue;
    const bDates = barDates(page, r.bar);
    for (const d of r.deps) {
      const pred = byId.get(d.id);
      if (!pred || pred.type !== "task") continue;
      const aDates = barDates(page, pred.bar);
      const conflict = Boolean(aDates && bDates && depBad(d.type, aDates, bDates));
      edges.push({
        fromId: pred.id,
        toId: r.id,
        type: d.type,
        conflict,
      });
    }
  }
  return edges;
}

/**
 * Applies cascade shift from `movedId` to downstream dependents
 * while preserving each task's working-day (HK) duration.
 */
export function cascadeShiftRows(
  page: PageData,
  rows: TimelineRow[],
  movedId: string
): TimelineRow[] {
  if (!page.cascade) return rows;
  const ctx = makeCalendarContext(page);
  const nextRows = rows.map((r) =>
    r.bar ? { ...r, bar: { ...r.bar } } : { ...r }
  );
  const byId = new Map<string, TimelineRow>();
  nextRows.forEach((r) => byId.set(r.id, r));

  const queue: string[] = [movedId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const predId = queue.shift()!;
    if (visited.has(predId)) continue;
    visited.add(predId);

    const pred = byId.get(predId);
    const aBd = pred ? barDates(page, pred.bar) : null;
    if (!aBd) continue;

    for (const succ of nextRows) {
      if (succ.type !== "task" || !succ.bar || !succ.deps?.length) continue;
      const rel = succ.deps.find((d) => d.id === predId);
      if (!rel) continue;

      const bBd = barDates(page, succ.bar);
      if (!bBd) continue;

      const hkDur = Math.max(1, countHK(ctx, bBd.sd, bBd.ed));
      let newSd = bBd.sd;
      let newEd = bBd.ed;
      let changed = false;

      if (rel.type === "FS" && bBd.sd <= aBd.ed) {
        newSd = page.wdSnap
          ? nextWD(ctx, addDays(aBd.ed, 1))
          : addDays(aBd.ed, 1);
        newEd = addHK(ctx, newSd, hkDur);
        changed = true;
      } else if (rel.type === "SS" && bBd.sd < aBd.sd) {
        newSd = page.wdSnap ? nextWD(ctx, aBd.sd) : new Date(aBd.sd);
        newEd = addHK(ctx, newSd, hkDur);
        changed = true;
      } else if (rel.type === "FF" && bBd.ed < aBd.ed) {
        newEd = page.wdSnap ? prevWD(ctx, aBd.ed) : new Date(aBd.ed);
        const span = Math.max(0, dayDiff(bBd.ed, bBd.sd));
        newSd = page.wdSnap
          ? prevWD(ctx, addDays(newEd, -span))
          : addDays(newEd, -span);
        changed = true;
      } else if (rel.type === "SF" && bBd.ed < aBd.sd) {
        newEd = page.wdSnap ? prevWD(ctx, aBd.sd) : new Date(aBd.sd);
        const span = Math.max(0, dayDiff(bBd.ed, bBd.sd));
        newSd = page.wdSnap
          ? prevWD(ctx, addDays(newEd, -span))
          : addDays(newEd, -span);
        changed = true;
      }

      if (changed) {
        if (page.dateMode === "day" || succ.bar.sd) {
          succ.bar.sd = fmtISO(newSd);
          succ.bar.ed = fmtISO(newEd);
        } else {
          succ.bar.startMonth = monthName(newSd.getMonth(), "id");
          succ.bar.startWeek = weekOf(newSd);
          succ.bar.startYear = newSd.getFullYear();
          succ.bar.endMonth = monthName(newEd.getMonth(), "id");
          succ.bar.endWeek = weekOf(newEd);
          succ.bar.endYear = newEd.getFullYear();
        }
        queue.push(succ.id);
      }
    }
  }

  return nextRows;
}

/** Orthogonal SVG path between two bars. */
export function routeDepPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  type: DepType
): string {
  const gap = 10;
  if (type === "SS") {
    const elbowX = Math.min(x1, x2) - gap;
    return `M ${x1} ${y1} L ${elbowX} ${y1} L ${elbowX} ${y2} L ${x2} ${y2}`;
  }
  if (type === "FF") {
    const elbowX = Math.max(x1, x2) + gap;
    return `M ${x1} ${y1} L ${elbowX} ${y1} L ${elbowX} ${y2} L ${x2} ${y2}`;
  }
  // FS or SF
  if (x2 >= x1 + gap * 1.5) {
    const midX = x1 + (x2 - x1) / 2;
    return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
  }
  const midY = y1 + (y2 >= y1 ? 14 : -14);
  return `M ${x1} ${y1} L ${x1 + gap} ${y1} L ${x1 + gap} ${midY} L ${x2 - gap} ${midY} L ${x2 - gap} ${y2} L ${x2} ${y2}`;
}
