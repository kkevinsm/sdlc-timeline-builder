"use client";

import React, { useState } from "react";
import { Icon } from "@/components/IconSprite";
import { getPresetHolidays } from "@/constants/holidays";
import { WEEKDAY_ORDER } from "@/constants/theme";
import { useTimeline } from "@/store/useTimelineStore";

export function HolidaysPanel() {
  const { activePage, updateActivePage, t } = useTimeline();
  const [dateInput, setDateInput] = useState("");
  const [nameInput, setNameInput] = useState("");

  const toggleWeekday = (wd: number) => {
    const exists = activePage.workDays.includes(wd);
    if (exists && activePage.workDays.length <= 1) return;
    const next = exists
      ? activePage.workDays.filter((d) => d !== wd)
      : [...activePage.workDays, wd];
    updateActivePage({ workDays: next });
  };

  const addHoliday = () => {
    if (!dateInput) return;
    const label = nameInput.trim() || "Holiday";
    updateActivePage({
      holidays: [
        ...activePage.holidays,
        { id: `${dateInput}-${Date.now()}`, date: dateInput, name: label },
      ].sort((a, b) => a.date.localeCompare(b.date)),
    });
    setDateInput("");
    setNameInput("");
  };

  const addFixedHolidays = () => {
    const years = Array.from(new Set(activePage.months.map((m) => m.year)));
    const fixed = [
      ["01-01", "Tahun Baru Masehi"],
      ["05-01", "Hari Buruh Internasional"],
      ["06-01", "Hari Lahir Pancasila"],
      ["08-17", "Hari Kemerdekaan RI"],
      ["12-25", "Hari Raya Natal"],
    ] as const;
    const existingDates = new Set(activePage.holidays.map((h) => h.date));
    const additions = years.flatMap((y) =>
      fixed
        .map(([mmdd, name]) => ({
          id: `${y}-${mmdd}`,
          date: `${y}-${mmdd}`,
          name,
          preset: true,
        }))
        .filter((item) => !existingDates.has(item.date))
    );
    if (additions.length === 0) return;
    updateActivePage({
      holidays: [...activePage.holidays, ...additions].sort((a, b) =>
        a.date.localeCompare(b.date)
      ),
    });
  };

  return (
    <div className="panel">
      <div className="sec">
        <div className="sec-h">
          <Icon name="calendar" />
          <span>{t("wd.sec")}</span>
        </div>
        <div className="sec-b">
          <div className="pl-wds" role="group" aria-label={t("wd.sec")}>
            {WEEKDAY_ORDER.map((wd) => {
              const pressed = activePage.workDays.includes(wd);
              return (
                <button
                  key={wd}
                  type="button"
                  className="pl-wd"
                  aria-pressed={pressed}
                  onClick={() => toggleWeekday(wd)}
                >
                  {t(`wd.${wd}` as "wd.1")}
                </button>
              );
            })}
          </div>
          <div className="hint">{t("wd.hint")}</div>
        </div>
      </div>

      <div className="sec">
        <div className="sec-h">
          <Icon name="plus" />
          <span>{t("pg.sec.hl")}</span>
        </div>
        <div className="sec-b">
          <div className="row2" style={{ gridTemplateColumns: "1fr 1.2fr" }}>
            <div className="fg">
              <label htmlFor="hl-d">{t("pg.hl.date")}</label>
              <input
                type="date"
                className="inp sm"
                id="hl-d"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
              />
            </div>
            <div className="fg">
              <label htmlFor="hl-n">{t("pg.hl.name")}</label>
              <input
                type="text"
                className="inp sm"
                id="hl-n"
                value={nameInput}
                placeholder={t("pg.hl.ph")}
                onChange={(e) => setNameInput(e.target.value)}
              />
            </div>
          </div>
          <button
            type="button"
            className="btn sm primary block"
            onClick={addHoliday}
          >
            <Icon name="plus" />
            <span>{t("pg.hl.add")}</span>
          </button>
          <div className="fg">
            <label>{t("pg.hl.preset")}</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                className="btn xs soft"
                onClick={() => {
                  const existing = new Set(activePage.holidays.map((h) => h.date));
                  const adds = getPresetHolidays(2026, true).filter((h) => !existing.has(h.date));
                  if (adds.length) {
                    updateActivePage({
                      holidays: [...activePage.holidays, ...adds].sort((a, b) => a.date.localeCompare(b.date)),
                    });
                  }
                }}
              >
                <Icon name="holiday" />
                <span>SKB 2026</span>
              </button>
              <button
                type="button"
                className="btn xs soft"
                onClick={() => {
                  const existing = new Set(activePage.holidays.map((h) => h.date));
                  const adds = getPresetHolidays(2027, true).filter((h) => !existing.has(h.date));
                  if (adds.length) {
                    updateActivePage({
                      holidays: [...activePage.holidays, ...adds].sort((a, b) => a.date.localeCompare(b.date)),
                    });
                  }
                }}
              >
                <Icon name="holiday" />
                <span>SKB 2027</span>
              </button>
              <button
                type="button"
                className="btn xs soft"
                onClick={addFixedHolidays}
              >
                <Icon name="calendar" />
                <span>{t("pg.hl.fixed")}</span>
              </button>
            </div>
          </div>
          <div className="hint">{t("pg.hl.hint")}</div>
        </div>
      </div>

      <div className="sec">
        <div className="sec-h">
          <Icon name="holiday" />
          <span>{t("pg.sec.hllist")}</span>
          <span className="sp" />
          {activePage.holidays.length > 0 && (
            <button
              type="button"
              className="sec-a"
              onClick={() => updateActivePage({ holidays: [] })}
            >
              <Icon name="trash" size="sm" />
              <span>{t("pg.hl.clear")}</span>
            </button>
          )}
        </div>
        <div className="sec-b">
          {activePage.holidays.length === 0 ? (
            <div className="hint">—</div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {activePage.holidays.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between gap-2 text-[12px] px-2 py-1.5 rounded-lg border border-[var(--line)]"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-[var(--ink)] truncate">
                      {h.name}
                    </div>
                    <div className="text-[10.5px] text-[var(--muted)]">
                      {h.date}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="ibtn"
                    aria-label={`Remove ${h.name}`}
                    onClick={() =>
                      updateActivePage({
                        holidays: activePage.holidays.filter(
                          (x) => x.id !== h.id
                        ),
                      })
                    }
                  >
                    <Icon name="x" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
