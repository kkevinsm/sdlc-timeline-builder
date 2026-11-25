import { addDays, fmtISO, monthName, parseISO, weekEnd, weekOf, weekStart } from "@/engine/calendar";
import type { PageData, TimelineRow } from "@/types/timeline";

export const LIST_MAX = 200;

export interface ParsedPasteRow {
  name: string;
  sd?: string;
  ed?: string;
  owner?: string;
}

const MONTH_MAP: Record<string, number> = {
  jan: 0, januari: 0, january: 0,
  feb: 1, februari: 1, february: 1,
  mar: 2, maret: 2, march: 2,
  apr: 3, april: 3,
  mei: 4, may: 4,
  jun: 5, juni: 5, june: 5,
  jul: 6, juli: 6, july: 6,
  agu: 7, agustus: 7, aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  okt: 9, oktober: 9, oct: 9, october: 9,
  nov: 10, november: 10,
  des: 11, desember: 11, dec: 11, december: 11,
};

function tryParseDateCell(raw: string, fallbackYear: number): string | undefined {
  const s = raw.trim();
  if (!s) return undefined;

  // YYYY-MM-DD or YYYY/MM/DD
  const iso = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(s);
  if (iso) {
    const dt = parseISO(
      `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`
    );
    return dt ? fmtISO(dt) : undefined;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = /^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/.exec(s);
  if (dmy) {
    const y = dmy[3].length === 2 ? 2000 + Number(dmy[3]) : Number(dmy[3]);
    const mo = Number(dmy[2]);
    const d = Number(dmy[1]);
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      const dt = new Date(y, mo - 1, d);
      if (dt.getMonth() === mo - 1 && dt.getDate() === d) return fmtISO(dt);
    }
  }

  // DD MMM YYYY or DD MMM
  const txt = /^(\d{1,2})\s+([a-zA-Z]+)(?:\s+(\d{4}))?$/.exec(s);
  if (txt) {
    const mo = MONTH_MAP[txt[2].toLowerCase()];
    if (mo !== undefined) {
      const y = txt[3] ? Number(txt[3]) : fallbackYear;
      const d = Number(txt[1]);
      const dt = new Date(y, mo, d);
      if (dt.getMonth() === mo && dt.getDate() === d) return fmtISO(dt);
    }
  }

  return undefined;
}

function cleanBullet(line: string): string {
  return line
    .replace(/^\s*(?:[-*•▪◦‣–—]+|\d+[.)]|\([a-zA-Z0-9]+\)|\[[ xX]?\])\s+/, "")
    .trim();
}

export function parsePasteList(
  rawText: string,
  fallbackYear: number
): ParsedPasteRow[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, LIST_MAX);

  return lines
    .map((line): ParsedPasteRow | null => {
      // Tab-separated (Excel / Google Sheets)
      if (line.includes("\t")) {
        const cols = line.split("\t").map((c) => c.trim());
        const name = cleanBullet(cols[0] || "");
        if (!name) return null;
        const d1 = cols[1] ? tryParseDateCell(cols[1], fallbackYear) : undefined;
        const d2 = cols[2] ? tryParseDateCell(cols[2], fallbackYear) : undefined;
        const owner = !d2 && cols[2] ? cols[2] : cols[3] || undefined;
        return {
          name,
          sd: d1,
          ed: d2 || d1,
          owner,
        };
      }

      const name = cleanBullet(line);
      return name ? { name } : null;
    })
    .filter((r): r is ParsedPasteRow => r !== null);
}

export function buildRowsFromPaste(
  parsed: ParsedPasteRow[],
  page: PageData
): TimelineRow[] {
  const baseMonth = page.cm || page.months[0]?.name || "Januari";
  const baseYear = page.cy || page.months[0]?.year || page.year;
  const baseWeek = page.cw || 1;
  let cursorDate = weekStart(baseMonth, baseYear, baseWeek);

  return parsed.map((item, idx) => {
    let sdDate: Date;
    let edDate: Date;

    if (item.sd) {
      sdDate = parseISO(item.sd) || cursorDate;
      edDate = (item.ed ? parseISO(item.ed) : null) || sdDate;
      if (edDate < sdDate) edDate = sdDate;
    } else {
      sdDate = new Date(cursorDate);
      edDate = weekEnd(
        monthName(sdDate.getMonth(), "id"),
        sdDate.getFullYear(),
        weekOf(sdDate)
      );
      cursorDate = addDays(edDate, 1);
    }

    const useDay = page.dateMode === "day" || Boolean(item.sd);

    return {
      id: `paste-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
      type: "task",
      name: item.name,
      owner: item.owner || "",
      bar: useDay
        ? {
            sd: fmtISO(sdDate),
            ed: fmtISO(edDate),
            progress: 0,
            status: "notstarted",
          }
        : {
            startMonth: monthName(sdDate.getMonth(), "id"),
            startWeek: weekOf(sdDate),
            startYear: sdDate.getFullYear(),
            endMonth: monthName(edDate.getMonth(), "id"),
            endWeek: weekOf(edDate),
            endYear: edDate.getFullYear(),
            progress: 0,
            status: "notstarted",
          },
      deps: [],
    };
  });
}
