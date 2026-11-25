"use client";

import React, { useCallback, useRef } from "react";
import { Icon, type IconName } from "@/components/IconSprite";
import { HolidaysPanel } from "@/components/Sidebar/HolidaysPanel";
import { MonthsPanel } from "@/components/Sidebar/MonthsPanel";
import { RowsPanel } from "@/components/Sidebar/RowsPanel";
import { SlidePanel } from "@/components/Sidebar/SlidePanel";
import { useTimeline } from "@/store/useTimelineStore";
import type { SidebarTab } from "@/types/timeline";

const TABS: {
  id: SidebarTab;
  icon: IconName;
  labelKey: "pg.tab.slide" | "pg.tab.months" | "pg.tab.rows" | "pg.tab.cal";
  titleKey:
    | "pg.tab.slide.t"
    | "pg.tab.months.t"
    | "pg.tab.rows.t"
    | "pg.tab.cal.t";
}[] = [
  { id: "slide", icon: "slide", labelKey: "pg.tab.slide", titleKey: "pg.tab.slide.t" },
  { id: "months", icon: "calendar", labelKey: "pg.tab.months", titleKey: "pg.tab.months.t" },
  { id: "rows", icon: "rows", labelKey: "pg.tab.rows", titleKey: "pg.tab.rows.t" },
  { id: "cal", icon: "holiday", labelKey: "pg.tab.cal", titleKey: "pg.tab.cal.t" },
];

export function Sidebar() {
  const {
    activePage,
    sidebarTab,
    setSidebarTab,
    sidebarCollapsed,
    toggleSidebar,
    t,
  } = useTimeline();

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const taskCount = activePage.rows.filter((r) => r.type === "task").length;

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const prevKey = sidebarCollapsed ? "ArrowUp" : "ArrowLeft";
      const nextKey = sidebarCollapsed ? "ArrowDown" : "ArrowRight";
      if (![prevKey, nextKey, "Home", "End"].includes(e.key)) return;

      const idx = TABS.findIndex((tab) => tab.id === sidebarTab);
      if (idx === -1) return;
      e.preventDefault();

      let nextIdx = idx;
      if (e.key === nextKey) nextIdx = (idx + 1) % TABS.length;
      else if (e.key === prevKey)
        nextIdx = (idx - 1 + TABS.length) % TABS.length;
      else if (e.key === "Home") nextIdx = 0;
      else if (e.key === "End") nextIdx = TABS.length - 1;

      setSidebarTab(TABS[nextIdx].id);
      tabRefs.current[nextIdx]?.focus();
    },
    [sidebarCollapsed, sidebarTab, setSidebarTab]
  );

  return (
    <aside id="sidebar" className={sidebarCollapsed ? "collapsed" : ""}>
      <button
        type="button"
        className="sb-collapse"
        title={t("pg.sb.t")}
        aria-label={t("pg.sb.t")}
        aria-expanded={!sidebarCollapsed}
        onClick={toggleSidebar}
      >
        <Icon name="chev-left" />
      </button>

      <div
        className="sb-tabs"
        role="tablist"
        aria-label="Sidebar panels"
        aria-orientation={sidebarCollapsed ? "vertical" : "horizontal"}
        onKeyDown={handleTabKeyDown}
      >
        {TABS.map((tab, i) => {
          const selected = sidebarTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              id={`tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              className="sb-tab"
              title={t(tab.titleKey)}
              onClick={() => {
                setSidebarTab(tab.id);
                if (sidebarCollapsed) toggleSidebar();
              }}
            >
              <Icon name={tab.icon} />
              <span>{t(tab.labelKey)}</span>
              {tab.id === "rows" && (
                <span className="cnt" id="cnt-rows">
                  {taskCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="sb-panels">
        <div
          role="tabpanel"
          aria-labelledby="tab-slide"
          hidden={sidebarTab !== "slide"}
        >
          <SlidePanel />
        </div>
        <div
          role="tabpanel"
          aria-labelledby="tab-months"
          hidden={sidebarTab !== "months"}
        >
          <MonthsPanel />
        </div>
        <div
          role="tabpanel"
          aria-labelledby="tab-rows"
          hidden={sidebarTab !== "rows"}
        >
          <RowsPanel />
        </div>
        <div
          role="tabpanel"
          aria-labelledby="tab-cal"
          hidden={sidebarTab !== "cal"}
        >
          <HolidaysPanel />
        </div>
      </div>
    </aside>
  );
}
