import type { HolidayItem } from "@/types/timeline";

export interface RawHolidayPreset {
  d: string;
  n: string;
  k: "nasional" | "cuti";
}

export const ID_HOLIDAY_PRESETS: RawHolidayPreset[] = [
  { d: "2026-01-01", n: "Tahun Baru 2026 Masehi", k: "nasional" },
  { d: "2026-01-16", n: "Isra Mikraj Nabi Muhammad SAW", k: "nasional" },
  { d: "2026-02-16", n: "Cuti Bersama Imlek", k: "cuti" },
  { d: "2026-02-17", n: "Tahun Baru Imlek 2577 Kongzili", k: "nasional" },
  { d: "2026-03-18", n: "Cuti Bersama Nyepi", k: "cuti" },
  { d: "2026-03-19", n: "Hari Suci Nyepi (Tahun Baru Saka 1948)", k: "nasional" },
  { d: "2026-03-20", n: "Cuti Bersama Idul Fitri", k: "cuti" },
  { d: "2026-03-21", n: "Idul Fitri 1447 H", k: "nasional" },
  { d: "2026-03-22", n: "Idul Fitri 1447 H", k: "nasional" },
  { d: "2026-03-23", n: "Cuti Bersama Idul Fitri", k: "cuti" },
  { d: "2026-03-24", n: "Cuti Bersama Idul Fitri", k: "cuti" },
  { d: "2026-04-03", n: "Wafat Yesus Kristus", k: "nasional" },
  { d: "2026-04-05", n: "Kebangkitan Yesus Kristus (Paskah)", k: "nasional" },
  { d: "2026-05-01", n: "Hari Buruh Internasional", k: "nasional" },
  { d: "2026-05-14", n: "Kenaikan Yesus Kristus", k: "nasional" },
  { d: "2026-05-15", n: "Cuti Bersama Kenaikan Yesus Kristus", k: "cuti" },
  { d: "2026-05-27", n: "Idul Adha 1447 H", k: "nasional" },
  { d: "2026-05-28", n: "Cuti Bersama Idul Adha", k: "cuti" },
  { d: "2026-05-31", n: "Hari Raya Waisak 2570 BE", k: "nasional" },
  { d: "2026-06-01", n: "Hari Lahir Pancasila", k: "nasional" },
  { d: "2026-06-16", n: "Tahun Baru Islam 1448 H", k: "nasional" },
  { d: "2026-08-17", n: "Proklamasi Kemerdekaan RI", k: "nasional" },
  { d: "2026-08-25", n: "Maulid Nabi Muhammad SAW", k: "nasional" },
  { d: "2026-12-24", n: "Cuti Bersama Natal", k: "cuti" },
  { d: "2026-12-25", n: "Kelahiran Yesus Kristus (Natal)", k: "nasional" },
  { d: "2027-01-01", n: "Tahun Baru 2027 Masehi", k: "nasional" },
  { d: "2027-01-05", n: "Isra Mikraj Nabi Muhammad SAW", k: "nasional" },
  { d: "2027-02-05", n: "Cuti Bersama Imlek", k: "cuti" },
  { d: "2027-02-06", n: "Tahun Baru Imlek 2578 Kongzili", k: "nasional" },
  { d: "2027-03-08", n: "Hari Suci Nyepi (Tahun Baru Saka 1949)", k: "nasional" },
  { d: "2027-03-09", n: "Cuti Bersama Idul Fitri", k: "cuti" },
  { d: "2027-03-10", n: "Idul Fitri 1448 H", k: "nasional" },
  { d: "2027-03-11", n: "Idul Fitri 1448 H", k: "nasional" },
  { d: "2027-03-12", n: "Cuti Bersama Idul Fitri", k: "cuti" },
  { d: "2027-03-15", n: "Cuti Bersama Idul Fitri", k: "cuti" },
  { d: "2027-03-25", n: "Cuti Bersama Wafat Yesus Kristus", k: "cuti" },
  { d: "2027-03-26", n: "Wafat Yesus Kristus", k: "nasional" },
  { d: "2027-03-28", n: "Kebangkitan Yesus Kristus (Paskah)", k: "nasional" },
  { d: "2027-05-01", n: "Hari Buruh Internasional", k: "nasional" },
  { d: "2027-05-06", n: "Kenaikan Yesus Kristus", k: "nasional" },
  { d: "2027-05-17", n: "Idul Adha 1448 H", k: "nasional" },
  { d: "2027-05-18", n: "Cuti Bersama Idul Adha", k: "cuti" },
  { d: "2027-05-19", n: "Cuti Bersama Waisak", k: "cuti" },
  { d: "2027-05-20", n: "Hari Raya Waisak 2571 BE", k: "nasional" },
  { d: "2027-06-01", n: "Hari Lahir Pancasila", k: "nasional" },
  { d: "2027-06-06", n: "Tahun Baru Islam 1449 H", k: "nasional" },
  { d: "2027-08-15", n: "Maulid Nabi Muhammad SAW", k: "nasional" },
  { d: "2027-08-17", n: "Proklamasi Kemerdekaan RI", k: "nasional" },
  { d: "2027-12-24", n: "Cuti Bersama Natal", k: "cuti" },
  { d: "2027-12-25", n: "Kelahiran Yesus Kristus (Natal)", k: "nasional" },
  { d: "2027-12-26", n: "Isra Mikraj Nabi Muhammad SAW", k: "nasional" },
];

export function getPresetHolidays(year?: number, includeCuti = true): HolidayItem[] {
  return ID_HOLIDAY_PRESETS.filter(
    (h) =>
      (!year || h.d.startsWith(`${year}-`)) &&
      (includeCuti || h.k === "nasional")
  ).map((h) => ({
    id: `${h.d}-${h.k}`,
    date: h.d,
    name: h.n,
    preset: true,
  }));
}
