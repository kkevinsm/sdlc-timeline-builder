"use client";

import React, { useState } from "react";
import { Icon } from "@/components/IconSprite";
import { weeksInMonth } from "@/constants/defaults";
import { MONTH_NAMES_EN, MONTH_NAMES_ID } from "@/constants/theme";
import { useTimeline } from "@/store/useTimelineStore";
import type { MonthConfig } from "@/types/timeline";

export function MonthsPanel() {
  const { activePage, lang, updateActivePage, t } = useTimeline();
  const monthNames = lang === "en" ? MONTH_NAMES_EN : MONTH_NAMES_ID;

  const firstMonth = activePage.months[0];
  const lastMonth = activePage.months[activePage.months.length - 1];

  const [fromMonth, setFromMonth] = useState(
    firstMonth ? MONTH_NAMES_ID.indexOf(firstMonth.name as (typeof MONTH_NAMES_ID)[number]) : 0
  );
  const [fromYear, setFromYear] = useState(firstMonth?.year ?? new Date().getFullYear());
  const [toMonth, setToMonth] = useState(
    lastMonth ? MONTH_NAMES_ID.indexOf(lastMonth.name as (typeof MONTH_NAMES_ID)[number]) : 5
  );
  const [toYear, setToYear] = useState(lastMonth?.year ?? new Date().getFullYear());

  const totalCols = activePage.months.reduce(
    (sum, m) =>
      sum + m.weeks.filter((w) => !(m.hiddenWeeks || []).includes(w)).length,
    0
  );

  const toggleWeekChip = (monthId: string, w: number) => {
    updateActivePage((prev) => ({
      ...prev,
      months: prev.months.map((m) => {
        if (m.id !== monthId) return m;
        const hidden = m.hiddenWeeks || [];
        const isHidden = hidden.includes(w);
        return {
          ...m,
          hiddenWeeks: isHidden
            ? hidden.filter((x) => x !== w)
            : [...hidden, w],
        };
      }),
    }));
  };

  const applyRange = () => {
    const startTotal = fromYear * 12 + fromMonth;
    const endTotal = toYear * 12 + toMonth;
    if (endTotal < startTotal || endTotal - startTotal > 35) return;
    const nextMonths: MonthConfig[] = [];
    for (let tIdx = startTotal; tIdx <= endTotal; tIdx++) {
      const y = Math.floor(tIdx / 12);
      const m = tIdx % 12;
      nextMonths.push({
        id: `${y}-${String(m + 1).padStart(2, "0")}`,
        name: MONTH_NAMES_ID[m],
        year: y,
        weeks: weeksInMonth(y, m),
        hiddenWeeks: [],
      });
    }
    updateActivePage({ months: nextMonths });
  };

  const addNextMonth = () => {
    const last = activePage.months[activePage.months.length - 1];
    const baseIdx = last
      ? last.year * 12 +
        Math.max(
          0,
          MONTH_NAMES_ID.indexOf(last.name as (typeof MONTH_NAMES_ID)[number])
        ) +
        1
      : new Date().getFullYear() * 12 + new Date().getMonth();
    const y = Math.floor(baseIdx / 12);
    const m = baseIdx % 12;
    const next: MonthConfig = {
      id: `${y}-${String(m + 1).padStart(2, "0")}`,
      name: MONTH_NAMES_ID[m],
      year: y,
      weeks: weeksInMonth(y, m),
      hiddenWeeks: [],
    };
    updateActivePage({ months: [...activePage.months, next] });
  };

  return (
    <div className="panel">
      <div className="sec">
        <div className="sec-h">
          <Icon name="calendar" />
          <span>{t("pg.sec.sched")}</span>
        </div>
        <div className="sec-b">
          <div className="fg">
            <label>{t("pg.dm.label")}</label>
            <div className="dm-seg" role="group" aria-label={t("pg.dm.label")}>
              <button
                type="button"
                className="btn sm"
                aria-pressed={activePage.dateMode === "week"}
                onClick={() => updateActivePage({ dateMode: "week" })}
              >
                <span>{t("pg.dm.week")}</span>
                <small>{t("pg.dm.week.d")}</small>
              </button>
              <button
                type="button"
                className="btn sm"
                aria-pressed={activePage.dateMode === "day"}
                onClick={() => updateActivePage({ dateMode: "day" })}
              >
                <span>{t("pg.dm.day")}</span>
                <small>{t("pg.dm.day.d")}</small>
              </button>
            </div>
          </div>

          <label className="tgl">
            <input
              type="checkbox"
              checked={activePage.cascade}
              onChange={(e) => updateActivePage({ cascade: e.target.checked })}
            />
            <span className="tk" />
            <span className="tx">
              <span>{t("pg.cascade")}</span>
              <small>{t("pg.cascade.d")}</small>
            </span>
          </label>

          <label className="tgl">
            <input
              type="checkbox"
              checked={activePage.wdSnap}
              onChange={(e) => updateActivePage({ wdSnap: e.target.checked })}
            />
            <span className="tk" />
            <span className="tx">
              <span>{t("pg.wdsnap")}</span>
              <small>{t("pg.wdsnap.d")}</small>
            </span>
          </label>
        </div>
      </div>

      <div className="sec">
        <div className="sec-h">
          <Icon name="sparkle" />
          <span>{t("pg.sec.range")}</span>
        </div>
        <div className="sec-b">
          <div className="range-row">
            <span className="lbl">{t("pg.range.from")}</span>
            <select
              className="inp sm"
              value={fromMonth}
              onChange={(e) => setFromMonth(Number(e.target.value))}
            >
              {monthNames.map((n, i) => (
                <option key={n} value={i}>
                  {n}
                </option>
              ))}
            </select>
            <input
              type="number"
              className="inp sm"
              min={2000}
              max={2100}
              value={fromYear}
              onChange={(e) => setFromYear(Number(e.target.value) || 2026)}
            />
            <span className="lbl">{t("pg.range.to")}</span>
            <select
              className="inp sm"
              value={toMonth}
              onChange={(e) => setToMonth(Number(e.target.value))}
            >
              {monthNames.map((n, i) => (
                <option key={n} value={i}>
                  {n}
                </option>
              ))}
            </select>
            <input
              type="number"
              className="inp sm"
              min={2000}
              max={2100}
              value={toYear}
              onChange={(e) => setToYear(Number(e.target.value) || 2026)}
            />
          </div>
          <button
            type="button"
            className="btn sm soft block"
            onClick={applyRange}
          >
            <Icon name="calendar" />
            <span>{t("pg.range.apply")}</span>
          </button>
          <div className="hint">{t("pg.range.hint")}</div>
        </div>
      </div>

      <div className="sec">
        <div className="sec-h">
          <Icon name="calendar" />
          <span>{t("pg.sec.months")}</span>
          <span className="sp" />
          <span className="kv">
            {activePage.months.length} · {totalCols} {t("stats.cols")}
          </span>
        </div>
        <div className="sec-b">
          <div className="flex flex-col gap-[7px]">
            {activePage.months.map((m) => {
              const mIdx = MONTH_NAMES_ID.indexOf(
                m.name as (typeof MONTH_NAMES_ID)[number]
              );
              const isCurMonth =
                m.name === activePage.cm && m.year === activePage.cy;
              const visibleCount = m.weeks.filter(
                (w) => !(m.hiddenWeeks || []).includes(w)
              ).length;
              return (
                <div
                  key={m.id}
                  className={`mcard${isCurMonth ? " cur" : ""}`}
                >
                  <div className="mcard-h">
                    <span className="font-bold text-[12px] text-[var(--ink)]">
                      {mIdx >= 0 ? monthNames[mIdx] : m.name} {m.year}
                    </span>
                    <span className="meta">{visibleCount}W</span>
                  </div>
                  <div className="wchips">
                    {m.weeks.map((w) => {
                      const isOff = (m.hiddenWeeks || []).includes(w);
                      const isCur = isCurMonth && activePage.cw === w;
                      return (
                        <button
                          key={w}
                          type="button"
                          className={`wchip${isOff ? " off" : ""}${isCur ? " cur" : ""}`}
                          onClick={() => toggleWeekChip(m.id, w)}
                        >
                          W{w}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            className="btn sm block"
            onClick={addNextMonth}
          >
            <Icon name="plus" />
            <span>{t("pg.addmonth")}</span>
          </button>
          <div className="hint">{t("pg.months.hint")}</div>
        </div>
      </div>
    </div>
  );
}
