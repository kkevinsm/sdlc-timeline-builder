import { createDefaultMonths } from "@/constants/defaults";
import { MONTH_NAMES_ID } from "@/constants/theme";
import {
  addDays,
  addHK,
  fmtISO,
  makeCalendarContext,
  monthName,
  nextWD,
  parseISO,
  prevWD,
  weekOf,
} from "@/engine/calendar";
import type { LangCode, PageData, TimelineRow } from "@/types/timeline";

export interface TemplateTaskSpec {
  name: { id: string; en: string };
  durationHK: number;
  owner?: string;
  ms?: boolean;
  progress?: number;
}

export interface TemplateGroupSpec {
  name: { id: string; en: string };
  tasks: TemplateTaskSpec[];
}

export interface ProjectTemplate {
  id: "simple" | "it" | "release" | "management";
  name: { id: string; en: string };
  exampleTitle: { id: string; en: string };
  subtitle: { id: string; en: string };
  desc: { id: string; en: string };
  accent: string;
  targetBadge: { id: string; en: string };
  groups: TemplateGroupSpec[];
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "simple",
    name: { id: "Simple", en: "Simple" },
    exampleTitle: {
      id: "Program Onboarding Karyawan Baru",
      en: "New Employee Onboarding Program",
    },
    subtitle: {
      id: "Rencana kerja 3 tahap · 7 langkah",
      en: "3-phase action plan · 7 steps",
    },
    desc: {
      id: "Cocok untuk rencana proyek ringkas: 3 tahap dan 7 langkah.",
      en: "Ideal for concise project plans: 3 phases and 7 steps.",
    },
    accent: "#1B7A3E",
    targetBadge: { id: "Siap Kerja", en: "Day-1 Ready" },
    groups: [
      {
        name: { id: "1. Persiapan", en: "1. Preparation" },
        tasks: [
          { name: { id: "Siapkan akun & perangkat kerja", en: "Provision accounts & hardware" }, durationHK: 4, owner: "IT Ops", progress: 100 },
          { name: { id: "Jadwalkan sesi perkenalan tim", en: "Schedule team intro sessions" }, durationHK: 3, owner: "HRBP", progress: 100 },
        ],
      },
      {
        name: { id: "2. Minggu Pertama", en: "2. First Week" },
        tasks: [
          { name: { id: "Orientasi perusahaan & budaya", en: "Company & culture orientation" }, durationHK: 3, owner: "People Team", progress: 70 },
          { name: { id: "Pengenalan sistem & alur kerja", en: "Tools & workflow walkthrough" }, durationHK: 4, owner: "Tech Lead", progress: 40 },
          { name: { id: "Penugasan tugas awal (starter task)", en: "Assign starter task" }, durationHK: 5, owner: "Manager", progress: 0 },
        ],
      },
      {
        name: { id: "3. Evaluasi 30 Hari", en: "3. 30-Day Review" },
        tasks: [
          { name: { id: "Sesi umpan balik & coaching", en: "Feedback & coaching check-in" }, durationHK: 4, owner: "Manager", progress: 0 },
          { name: { id: "Sign-off masa onboarding", en: "Onboarding sign-off" }, durationHK: 2, owner: "HRBP", ms: true, progress: 0 },
        ],
      },
    ],
  },
  {
    id: "it",
    name: { id: "IT Implementation", en: "IT Implementation" },
    exampleTitle: {
      id: "Implementasi Sistem HRIS Perusahaan",
      en: "Enterprise HRIS System Implementation",
    },
    subtitle: {
      id: "Fase analisis, migrasi, UAT hingga go-live",
      en: "Discovery, migration, UAT to go-live",
    },
    desc: {
      id: "Cocok untuk implementasi sistem: analisis, migrasi data, UAT, go-live, dan hypercare.",
      en: "Built for system rollouts: discovery, data migration, UAT, go-live, and hypercare.",
    },
    accent: "#1D4ED8",
    targetBadge: { id: "Go-Live", en: "Go-Live" },
    groups: [
      {
        name: { id: "Discovery & Desain", en: "Discovery & Design" },
        tasks: [
          { name: { id: "Kickoff & pengumpulan requirement", en: "Kickoff & requirement gathering" }, durationHK: 5, owner: "BA / PM", progress: 100 },
          { name: { id: "Gap analysis & desain arsitektur", en: "Gap analysis & architecture design" }, durationHK: 6, owner: "Solution Arch", progress: 100 },
        ],
      },
      {
        name: { id: "Build & Migrasi Data", en: "Build & Data Migration" },
        tasks: [
          { name: { id: "Konfigurasi modul inti & payroll", en: "Core module & payroll config" }, durationHK: 10, owner: "Tech Team", progress: 65 },
          { name: { id: "Pembersihan & migrasi master data", en: "Master data cleansing & migration" }, durationHK: 7, owner: "Data Eng", progress: 35 },
        ],
      },
      {
        name: { id: "UAT, Go-Live & Hypercare", en: "UAT, Go-Live & Hypercare" },
        tasks: [
          { name: { id: "User Acceptance Testing (UAT)", en: "User Acceptance Testing (UAT)" }, durationHK: 6, owner: "QA & Users", progress: 0 },
          { name: { id: "Training end-user & admin", en: "End-user & admin training" }, durationHK: 4, owner: "Change Mgmt", progress: 0 },
          { name: { id: "Production Go-Live", en: "Production Go-Live" }, durationHK: 2, owner: "PMO", ms: true, progress: 0 },
          { name: { id: "Dukungan pasca-rilis (Hypercare)", en: "Post-launch Hypercare" }, durationHK: 5, owner: "Support", progress: 0 },
        ],
      },
    ],
  },
  {
    id: "release",
    name: { id: "Release", en: "Release" },
    exampleTitle: {
      id: "Rilis Aplikasi Mobile v2.0",
      en: "Mobile App v2.0 Release Plan",
    },
    subtitle: {
      id: "Pengembangan, QA, Beta, Store Review & Rollout",
      en: "Engineering, QA, Beta, Store Review & Rollout",
    },
    desc: {
      id: "Cocok untuk jadwal rilis: pengembangan, QA, beta, review store, dan rollout bertahap.",
      en: "For product releases: dev freeze, QA, beta testing, store review, and staged rollout.",
    },
    accent: "#6D28D9",
    targetBadge: { id: "Rilis v2.0", en: "v2.0 Launch" },
    groups: [
      {
        name: { id: "Engineering & Feature Freeze", en: "Engineering & Feature Freeze" },
        tasks: [
          { name: { id: "Finalisasi fitur utama & API", en: "Core features & API completion" }, durationHK: 8, owner: "Mobile Team", progress: 100 },
          { name: { id: "Code freeze & release candidate", en: "Code freeze & release candidate" }, durationHK: 2, owner: "Release Eng", ms: true, progress: 100 },
        ],
      },
      {
        name: { id: "QA & Beta Testing", en: "QA & Beta Testing" },
        tasks: [
          { name: { id: "Regression testing & bug bash", en: "Regression testing & bug bash" }, durationHK: 5, owner: "QA Lead", progress: 55 },
          { name: { id: "Closed beta (TestFlight / Play)", en: "Closed beta (TestFlight / Play)" }, durationHK: 5, owner: "Product", progress: 20 },
        ],
      },
      {
        name: { id: "Store Review & Rollout", en: "Store Review & Rollout" },
        tasks: [
          { name: { id: "Submit App Store & Play Store", en: "App Store & Play Store review" }, durationHK: 4, owner: "Release Eng", progress: 0 },
          { name: { id: "Staged rollout 10% → 100%", en: "Staged rollout 10% → 100%" }, durationHK: 4, owner: "Product", ms: true, progress: 0 },
        ],
      },
    ],
  },
  {
    id: "management",
    name: { id: "Management", en: "Management" },
    exampleTitle: {
      id: "Roadmap Inisiatif Strategis 2026",
      en: "2026 Strategic Initiatives Roadmap",
    },
    subtitle: {
      id: "Ringkasan eksekutif per pilar bisnis",
      en: "Executive summary across strategic pillars",
    },
    desc: {
      id: "Cocok untuk roadmap manajemen: bar panjang per pilar, tanpa detail teknis.",
      en: "Built for executive roadmaps: high-level pillar bars without technical noise.",
    },
    accent: "#0F766E",
    targetBadge: { id: "Target Q2", en: "Q2 Target" },
    groups: [
      {
        name: { id: "Pilar 1: Transformasi Layanan", en: "Pillar 1: Service Transformation" },
        tasks: [
          { name: { id: "Digitalisasi onboarding pelanggan", en: "Digital customer onboarding" }, durationHK: 15, owner: "CX Lead", progress: 90 },
          { name: { id: "Peluncuran portal self-service", en: "Self-service portal launch" }, durationHK: 10, owner: "Digital", ms: true, progress: 45 },
        ],
      },
      {
        name: { id: "Pilar 2: Efisiensi Operasional", en: "Pillar 2: Operational Efficiency" },
        tasks: [
          { name: { id: "Otomasi pelaporan keuangan", en: "Finance reporting automation" }, durationHK: 14, owner: "Finance", progress: 60 },
          { name: { id: "Konsolidasi vendor & SLA", en: "Vendor & SLA consolidation" }, durationHK: 12, owner: "Ops", progress: 15 },
        ],
      },
      {
        name: { id: "Pilar 3: Ekspansi Pasar", en: "Pillar 3: Market Expansion" },
        tasks: [
          { name: { id: "Kemitraan strategis regional", en: "Regional strategic partnerships" }, durationHK: 16, owner: "BD", progress: 20 },
          { name: { id: "Review Direksi & Go-to-Market", en: "Board Review & Go-to-Market" }, durationHK: 4, owner: "CEO Office", ms: true, progress: 0 },
        ],
      },
    ],
  },
];

export interface SchedulePlanOptions {
  template: ProjectTemplate;
  mode: "fwd" | "back";
  anchorDateISO: string;
  bufferDays: number;
  lang: LangCode;
  basePage: PageData;
}

export function generatePlannedPage(opts: SchedulePlanOptions): Partial<PageData> {
  const { template, mode, anchorDateISO, bufferDays, lang, basePage } = opts;
  const ctx = makeCalendarContext(basePage);
  const anchor = parseISO(anchorDateISO) || new Date();

  const totalHK = template.groups.reduce(
    (sum, g) => sum + g.tasks.reduce((s, t) => s + t.durationHK, 0),
    0
  );

  // Calculate start date
  let cursor: Date;
  if (mode === "back") {
    // Subtract totalHK + bufferDays from anchor backward
    const targetEnd = prevWD(ctx, anchor);
    let backSteps = totalHK + Math.max(0, bufferDays);
    let d = new Date(targetEnd);
    while (backSteps > 1) {
      d = addDays(d, -1);
      if (ctx.wdSet.has(d.getDay())) backSteps--;
    }
    cursor = nextWD(ctx, d);
  } else {
    cursor = nextWD(ctx, anchor);
    if (bufferDays > 0) {
      cursor = addHK(ctx, cursor, bufferDays + 1);
    }
  }

  const rows: TimelineRow[] = [];
  let minDate: Date | null = null;
  let maxDate: Date | null = null;
  let prevTaskId: string | null = null;

  template.groups.forEach((grp, gIdx) => {
    const grpId = `tpl-grp-${gIdx}-${Date.now()}`;
    rows.push({
      id: grpId,
      type: "group",
      name: grp.name[lang],
      collapsed: false,
    });

    grp.tasks.forEach((tsk, tIdx) => {
      const sd = nextWD(ctx, cursor);
      const ed = addHK(ctx, sd, tsk.durationHK);
      if (!minDate || sd < minDate) minDate = sd;
      if (!maxDate || ed > maxDate) maxDate = ed;

      const tId = `tpl-tsk-${gIdx}-${tIdx}-${Date.now()}`;
      const prog = tsk.progress ?? 0;
      rows.push({
        id: tId,
        type: "task",
        name: tsk.name[lang],
        owner: tsk.owner || "",
        bar: {
          sd: fmtISO(sd),
          ed: fmtISO(ed),
          startMonth: monthName(sd.getMonth(), "id"),
          startWeek: weekOf(sd),
          startYear: sd.getFullYear(),
          endMonth: monthName(ed.getMonth(), "id"),
          endWeek: weekOf(ed),
          endYear: ed.getFullYear(),
          progress: prog,
          status: prog >= 100 ? "done" : prog > 0 ? "inprogress" : "notstarted",
          ms: Boolean(tsk.ms),
        },
        deps: prevTaskId ? [{ id: prevTaskId, type: "FS" }] : [],
      });

      prevTaskId = tId;
      cursor = nextWD(ctx, addDays(ed, 1));
    });
  });

  const startBase = minDate || new Date();
  const endBase = maxDate || addDays(startBase, 90);
  const monthSpan = Math.max(
    6,
    (endBase.getFullYear() - startBase.getFullYear()) * 12 +
      (endBase.getMonth() - startBase.getMonth()) +
      2
  );

  return {
    title: template.exampleTitle[lang],
    subtitle: template.subtitle[lang],
    tgt: template.targetBadge[lang],
    tgtc: template.accent,
    accent: template.accent,
    style: template.id,
    showOwner: template.id === "it" || template.id === "management",
    msRail: template.id === "release" || template.id === "it",
    today: fmtISO(addHK(ctx, startBase, Math.max(2, Math.floor(totalHK * 0.4)))),
    cm: MONTH_NAMES_ID[startBase.getMonth()],
    cw: weekOf(startBase),
    cy: startBase.getFullYear(),
    months: createDefaultMonths(startBase, Math.min(18, monthSpan)),
    rows,
  };
}
