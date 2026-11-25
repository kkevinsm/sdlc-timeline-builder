import type { ScaleMode, StatusKey } from "@/types/timeline";

export const LS_STORAGE_KEY = "molabs.tbp.ui.v3";
export const LANG_STORAGE_KEY = "molabs.tbp.lang";

export const ACCENTS = [
  "#1B7A3E",
  "#0F766E",
  "#1D4ED8",
  "#6D28D9",
  "#BE185D",
  "#C2410C",
  "#334155",
] as const;

export const BADGES = [
  "#1B7A3E",
  "#FF6A13",
  "#E53935",
  "#1D4ED8",
  "#6D28D9",
  "#0F766E",
  "#334155",
] as const;

export const DEP_DEFAULT_COLOR = "#64748B";

export const SIZE_DEF = {
  fs: 11,
  rh: 30,
  lw: 220,
  dw: 190,
  sw: 150,
  ww: 44,
  ow: 130,
} as const;

export const STATUS_META: Record<
  StatusKey,
  { color: string; icon: "check" | "clock" | "alert" | "dash-circle" }
> = {
  done: { color: "#1B7A3E", icon: "check" },
  inprogress: { color: "#F59E0B", icon: "clock" },
  atrisk: { color: "#E53935", icon: "alert" },
  notstarted: { color: "#B4BDB8", icon: "dash-circle" },
};

export const SCALE_MODES: ScaleMode[] = ["day", "3day", "week", "2week", "month"];

export const MONTH_NAMES_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

export const MONTH_NAMES_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const MONTH_SHORT_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
] as const;

export const MONTH_SHORT_EN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** Default Mon-Fri (ISO-like JS getDay(): 1..5) */
export const WD_DEF = [1, 2, 3, 4, 5] as const;

export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
