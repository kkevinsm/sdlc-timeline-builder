"use client";

import React, { useMemo, useState } from "react";
import { Icon } from "@/components/IconSprite";
import { STATUS_META } from "@/constants/theme";
import { formatRangeLabel } from "@/engine/calendar";
import { buildTimelineModel } from "@/engine/layoutModel";
import { statusFor } from "@/engine/status";
import { useTimeline } from "@/store/useTimelineStore";
import type { StatusKey } from "@/types/timeline";

export function RowsPanel() {
  const {
    project,
    activePage,
    lang,
    addGroup,
    addTask,
    updateRow,
    addDependency,
    removeDependency,
    deleteRow,
    moveRow,
    toggleGroupCollapse,
    expandAllGroups,
    collapseAllGroups,
    openModal,
    t,
  } = useTimeline();

  const [filter, setFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const model = useMemo(
    () => buildTimelineModel(activePage, project.mode, lang),
    [activePage, project.mode, lang]
  );

  const query = filter.trim().toLowerCase();
  const filteredRows = useMemo(() => {
    if (!query) return activePage.rows;
    return activePage.rows.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        (r.owner || "").toLowerCase().includes(query)
    );
  }, [activePage.rows, query]);

  const taskCount = activePage.rows.filter((r) => r.type === "task").length;

  return (
    <div className="panel">
      <div className="rl-tools">
        <div className="search">
          <Icon name="search" />
          <input
            type="search"
            className="inp"
            value={filter}
            placeholder={t("pg.rw.search")}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn sm soft"
          onClick={() => addGroup()}
        >
          <Icon name="group" />
          <span>{t("pg.group")}</span>
        </button>
        <button
          type="button"
          className="btn sm primary"
          onClick={() => addTask()}
        >
          <Icon name="task" />
          <span>{t("pg.task")}</span>
        </button>
        <button
          type="button"
          className="btn sm soft"
          title={t("list.btn.t")}
          onClick={() => openModal("paste")}
        >
          <Icon name="list" />
          <span>{t("list.btn")}</span>
        </button>
      </div>

      <div className="hrow" style={{ justifyContent: "space-between" }}>
        <span className="kv">
          {taskCount} {t("stats.tasks")}
        </span>
        <span className="hrow" style={{ gap: 2 }}>
          <button
            type="button"
            className="btn xs ghost"
            onClick={expandAllGroups}
          >
            <Icon name="unfold" />
            <span>{t("pg.rw.expand")}</span>
          </button>
          <button
            type="button"
            className="btn xs ghost"
            onClick={collapseAllGroups}
          >
            <Icon name="fold" />
            <span>{t("pg.rw.collapse")}</span>
          </button>
        </span>
      </div>

      {filteredRows.length === 0 ? (
        <div className="hint" style={{ paddingTop: 4 }}>
          {t("empty.desc")}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {filteredRows.map((row) => {
            const item = model.byId.get(row.id);
            const isOpen = expandedId === row.id;

            if (row.type === "group") {
              const grpProg = item?.kind === "group" ? item.prog : null;
              return (
                <div
                  key={row.id}
                  className="border border-[var(--brand-200)] bg-[var(--brand-50)] rounded-[10px] p-2 flex flex-col gap-1.5"
                >
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className="ibtn sm"
                      onClick={() => toggleGroupCollapse(row.id)}
                      aria-label="Toggle group"
                    >
                      <Icon
                        name={row.collapsed ? "chev-right" : "chev-down"}
                        size="sm"
                      />
                    </button>
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) =>
                        updateRow(row.id, { name: e.target.value })
                      }
                      className="flex-1 min-w-0 font-bold text-[12px] text-[var(--brand-800)] bg-transparent border border-transparent focus:border-[var(--brand)] focus:bg-white rounded px-1.5 py-0.5 outline-none"
                    />
                    {grpProg != null && (
                      <span className="text-[10px] font-bold text-[var(--brand-700)] bg-white px-1.5 py-0.5 rounded-full">
                        {grpProg}%
                      </span>
                    )}
                    <button
                      type="button"
                      className="ibtn sm"
                      onClick={() => moveRow(row.id, -1)}
                      aria-label="Move up"
                    >
                      <Icon name="up" size="sm" />
                    </button>
                    <button
                      type="button"
                      className="ibtn sm"
                      onClick={() => moveRow(row.id, 1)}
                      aria-label="Move down"
                    >
                      <Icon name="down" size="sm" />
                    </button>
                    <button
                      type="button"
                      className="ibtn sm danger"
                      onClick={() => deleteRow(row.id)}
                      aria-label="Delete group"
                    >
                      <Icon name="trash" size="sm" />
                    </button>
                  </div>
                </div>
              );
            }

            const tItem = item?.kind === "task" ? item : null;
            const stColor = STATUS_META[tItem?.st || "notstarted"].color;
            const b = row.bar;

            return (
              <div
                key={row.id}
                className="border border-[var(--line)] bg-white rounded-[10px] p-2 flex flex-col gap-1.5"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: stColor }}
                  />
                  <button
                    type="button"
                    className="flex-1 min-w-0 text-left font-semibold text-[12px] text-[var(--ink)] truncate"
                    onClick={() => setExpandedId(isOpen ? null : row.id)}
                  >
                    {row.name}
                  </button>
                  <button
                    type="button"
                    className={`ibtn sm${b?.ms ? " text-[#E09200]" : ""}`}
                    title="Milestone"
                    aria-pressed={Boolean(b?.ms)}
                    onClick={() =>
                      b &&
                      updateRow(row.id, {
                        bar: { ...b, ms: !b.ms },
                      })
                    }
                  >
                    <Icon name={b?.ms ? "star" : "diamond"} size="sm" />
                  </button>
                  <button
                    type="button"
                    className="ibtn sm"
                    onClick={() => setExpandedId(isOpen ? null : row.id)}
                    aria-label="Edit task"
                  >
                    <Icon name="edit" size="sm" />
                  </button>
                  <button
                    type="button"
                    className="ibtn sm danger"
                    onClick={() => deleteRow(row.id)}
                    aria-label="Delete task"
                  >
                    <Icon name="trash" size="sm" />
                  </button>
                </div>

                <div className="flex items-center gap-2 text-[10.5px] text-[var(--muted)] pl-4">
                  <span>
                    {tItem?.bd ? formatRangeLabel(tItem.bd, lang) : "—"}
                  </span>
                  {tItem && tItem.hk > 0 && (
                    <span className="font-semibold text-[var(--ink-2)]">
                      · {tItem.hk} {lang === "en" ? "WD" : "HK"}
                    </span>
                  )}
                  <span className="ml-auto font-bold text-[var(--ink-2)]">
                    {tItem?.prog ?? 0}%
                  </span>
                </div>

                {isOpen && b && (
                  <div className="pt-2 mt-1 border-t border-[var(--line-2)] flex flex-col gap-2">
                    <div className="fg">
                      <label>{lang === "en" ? "Task name" : "Nama task"}</label>
                      <input
                        type="text"
                        className="inp sm"
                        value={row.name}
                        onChange={(e) =>
                          updateRow(row.id, { name: e.target.value })
                        }
                      />
                    </div>
                    <div className="row2">
                      <div className="fg">
                        <label>PIC / Owner</label>
                        <input
                          type="text"
                          className="inp sm"
                          value={row.owner || ""}
                          placeholder="e.g. Budi"
                          onChange={(e) =>
                            updateRow(row.id, { owner: e.target.value })
                          }
                        />
                      </div>
                      <div className="fg">
                        <label>Progress ({b.progress}%)</label>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={5}
                          value={b.progress}
                          className="accent-[var(--brand)] mt-1.5"
                          onChange={(e) => {
                            const prog = Number(e.target.value);
                            updateRow(row.id, {
                              bar: {
                                ...b,
                                progress: prog,
                                status: statusFor(b.status, prog),
                              },
                            });
                          }}
                        />
                      </div>
                    </div>

                    {activePage.dateMode === "day" ? (
                      <div className="row2">
                        <div className="fg">
                          <label>{lang === "en" ? "Start" : "Mulai"}</label>
                          <input
                            type="date"
                            className="inp sm"
                            value={b.sd || ""}
                            onChange={(e) =>
                              updateRow(row.id, {
                                bar: { ...b, sd: e.target.value },
                              })
                            }
                          />
                        </div>
                        <div className="fg">
                          <label>{lang === "en" ? "End" : "Selesai"}</label>
                          <input
                            type="date"
                            className="inp sm"
                            value={b.ed || ""}
                            onChange={(e) =>
                              updateRow(row.id, {
                                bar: { ...b, ed: e.target.value },
                              })
                            }
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="row2">
                        <div className="fg">
                          <label>{lang === "en" ? "Start Week" : "Mulai"}</label>
                          <select
                            className="inp sm"
                            value={`${b.startMonth}|${b.startWeek}|${b.startYear || activePage.year}`}
                            onChange={(e) => {
                              const [sm, sw, sy] = e.target.value.split("|");
                              updateRow(row.id, {
                                bar: {
                                  ...b,
                                  startMonth: sm,
                                  startWeek: Number(sw),
                                  startYear: Number(sy),
                                },
                              });
                            }}
                          >
                            {activePage.months.flatMap((m) =>
                              m.weeks.map((w) => (
                                <option
                                  key={`s-${m.id}-${w}`}
                                  value={`${m.name}|${w}|${m.year}`}
                                >
                                  {m.name.slice(0, 3)} W{w} {m.year}
                                </option>
                              ))
                            )}
                          </select>
                        </div>
                        <div className="fg">
                          <label>{lang === "en" ? "End Week" : "Selesai"}</label>
                          <select
                            className="inp sm"
                            value={`${b.endMonth || b.startMonth}|${b.endWeek || b.startWeek}|${b.endYear || b.startYear || activePage.year}`}
                            onChange={(e) => {
                              const [em, ew, ey] = e.target.value.split("|");
                              updateRow(row.id, {
                                bar: {
                                  ...b,
                                  endMonth: em,
                                  endWeek: Number(ew),
                                  endYear: Number(ey),
                                },
                              });
                            }}
                          >
                            {activePage.months.flatMap((m) =>
                              m.weeks.map((w) => (
                                <option
                                  key={`e-${m.id}-${w}`}
                                  value={`${m.name}|${w}|${m.year}`}
                                >
                                  {m.name.slice(0, 3)} W{w} {m.year}
                                </option>
                              ))
                            )}
                          </select>
                        </div>
                      </div>
                    )}

                    <div className="row2 items-center">
                      <div className="fg">
                        <label>Status</label>
                        <select
                          className="inp sm"
                          value={tItem?.st || b.status}
                          onChange={(e) =>
                            updateRow(row.id, {
                              bar: {
                                ...b,
                                status: e.target.value as StatusKey,
                                statusLocked: true,
                              },
                            })
                          }
                        >
                          {(
                            [
                              "done",
                              "inprogress",
                              "atrisk",
                              "notstarted",
                            ] as const
                          ).map((st) => (
                            <option key={st} value={st}>
                              {t(`st.${st}.label`)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center justify-end gap-1 pt-3">
                        <button
                          type="button"
                          className="btn xs"
                          onClick={() => moveRow(row.id, -1)}
                        >
                          <Icon name="up" size="xs" />
                        </button>
                        <button
                          type="button"
                          className="btn xs"
                          onClick={() => moveRow(row.id, 1)}
                        >
                          <Icon name="down" size="xs" />
                        </button>
                      </div>
                    </div>

                    {/* Dependencies Editor */}
                    <div className="fg pt-1 border-t border-[var(--line-2)]">
                      <label>
                        {lang === "en" ? "Dependencies" : "Dependency (FS/SS/FF/SF)"}
                      </label>
                      {(row.deps || []).map((dep) => {
                        const targetTask = activePage.rows.find(
                          (x) => x.id === dep.id
                        );
                        return (
                          <div
                            key={dep.id}
                            className="flex items-center justify-between gap-1 text-[11px] bg-[var(--brand-50)] px-2 py-1 rounded-md"
                          >
                            <span className="truncate font-semibold">
                              [{dep.type}] {targetTask?.name || dep.id}
                            </span>
                            <button
                              type="button"
                              className="ibtn sm danger"
                              onClick={() => removeDependency(row.id, dep.id)}
                              aria-label="Remove dependency"
                            >
                              <Icon name="x" size="xs" />
                            </button>
                          </div>
                        );
                      })}
                      <select
                        className="inp sm"
                        value=""
                        onChange={(e) => {
                          if (!e.target.value) return;
                          addDependency(row.id, e.target.value, "FS");
                        }}
                      >
                        <option value="">
                          {lang === "en"
                            ? "+ Link predecessor (FS)..."
                            : "+ Hubungkan task sebelumnya (FS)..."}
                        </option>
                        {activePage.rows
                          .filter(
                            (other) =>
                              other.type === "task" &&
                              other.id !== row.id &&
                              !(row.deps || []).some((d) => d.id === other.id)
                          )
                          .map((other) => (
                            <option key={other.id} value={other.id}>
                              {other.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
