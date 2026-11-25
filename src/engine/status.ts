import { STATUS_META } from "@/constants/theme";
import { barDates, clamp, dayDiff, parseISO } from "@/engine/calendar";
import type { PageData, StatusKey, TaskBar } from "@/types/timeline";

export function statusFit(status: StatusKey | undefined, prog: number): StatusKey {
  const s: StatusKey = status && STATUS_META[status] ? status : "notstarted";
  if (prog >= 100) return "done";
  return s === "notstarted" && prog > 0 ? "inprogress" : s;
}

export function statusFor(status: StatusKey | undefined, prog: number): StatusKey {
  const s = statusFit(status, prog);
  if (s === "done" && prog < 100) return prog > 0 ? "inprogress" : "notstarted";
  return s === "inprogress" && prog <= 0 ? "notstarted" : s;
}

export function autoStat(page: PageData, b?: TaskBar | null): StatusKey | null {
  if (!page.autoStatus || !page.today || !b || b.statusLocked) return null;
  const t = parseISO(page.today);
  const bd = barDates(page, b);
  if (!t || !bd) return null;

  const prog = clamp(Number(b.progress) || 0, 0, 100);
  if (prog >= 100) return "done";
  if (t < bd.sd) return prog > 0 ? "done" : "notstarted";
  if (t > bd.ed) return "atrisk";

  const total = dayDiff(bd.ed, bd.sd) + 1;
  const el = dayDiff(t, bd.sd) + 1;
  const exp = Math.min(100, (el / total) * 100);
  if (prog >= exp) return "done";
  if (exp - prog >= (Number(page.atRiskThreshold) || 10)) return "atrisk";
  return prog > 0 ? "inprogress" : "notstarted";
}

export function effStat(page: PageData, b?: TaskBar | null): StatusKey {
  if (!b) return "notstarted";
  const a = autoStat(page, b);
  return a || statusFit(b.status, clamp(Number(b.progress) || 0, 0, 100));
}
