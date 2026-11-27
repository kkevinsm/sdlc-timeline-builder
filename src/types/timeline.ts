export type LangCode = "id" | "en";

export type ScaleMode = "day" | "3day" | "week" | "2week" | "month";

export type DateMode = "week" | "day";

export type StatusKey = "done" | "inprogress" | "atrisk" | "notstarted";

export type DepType = "FS" | "SS" | "FF" | "SF";

export type SlideStyleId = "standar" | "simple" | "it" | "release" | "management";

export type SidebarTab = "slide" | "months" | "rows" | "cal";

export type ColumnKey = "task" | "owner" | "duration" | "status";

export interface DependencyRef {
  id: string;
  type: DepType;
}

export interface BaselineRange {
  startMonth?: string;
  startWeek?: number;
  startYear?: number;
  endMonth?: string;
  endWeek?: number;
  endYear?: number;
  sd?: string;
  ed?: string;
}

export interface TaskBar {
  startMonth?: string;
  startWeek?: number;
  startYear?: number;
  endMonth?: string;
  endWeek?: number;
  endYear?: number;
  sd?: string;
  ed?: string;
  baseline?: BaselineRange;
  progress: number;
  status: StatusKey;
  statusLocked?: boolean;
  statusText?: string;
  durationLabel?: string;
  progressText?: string;
  ms?: boolean;
}

export interface TimelineRow {
  id: string;
  type: "group" | "task";
  name: string;
  collapsed?: boolean;
  durationLabel?: string;
  owner?: string;
  bar?: TaskBar;
  deps?: DependencyRef[];
}

export interface MonthConfig {
  id: string;
  name: string;
  year: number;
  weeks: number[];
  hiddenWeeks?: number[];
}

export interface HolidayItem {
  id: string;
  date: string;
  name: string;
  preset?: boolean;
}

export interface PageData {
  id: number;
  name: string;
  title: string;
  subtitle: string;
  tgt: string;
  tgtc: string;
  logl: string;
  logr: string;
  logoL: string;
  logoR: string;
  loglc: string;
  logrc: string;
  cm: string;
  cw: number;
  cy: number;
  today: string;
  year: number;
  fs: number;
  rh: number;
  lw: number;
  dw: number;
  sw: number;
  ww: number;
  ow: number;
  autoStatus: boolean;
  atRiskThreshold: number;
  showDeps: boolean;
  depColor: string;
  cascade: boolean;
  wdSnap: boolean;
  accent: string;
  showToday: boolean;
  showBaseline?: boolean;
  groupRollup: boolean;
  showLegend: boolean;
  showOwner: boolean;
  msRail: boolean;
  dateMode: DateMode;
  style?: SlideStyleId;
  colOrder?: ColumnKey[];
  workDays: number[];
  months: MonthConfig[];
  rows: TimelineRow[];
  holidays: HolidayItem[];
}

export interface ProjectData {
  version: number;
  name: string;
  mode: ScaleMode;
  zoom: number;
  activePageId: number;
  pages: PageData[];
}
