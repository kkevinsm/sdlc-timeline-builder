"use client";

import React, { useState } from "react";
import { Icon } from "@/components/IconSprite";
import {
  generatePlannedPage,
  PROJECT_TEMPLATES,
  type ProjectTemplate,
} from "@/constants/templates";
import { fmtISO } from "@/engine/calendar";
import { useTimeline } from "@/store/useTimelineStore";

export function PlanWizardModal() {
  const { activePage, activeModal, closeModal, lang, updateActivePage } =
    useTimeline();

  const [selectedId, setSelectedId] = useState<ProjectTemplate["id"]>("it");
  const [mode, setMode] = useState<"fwd" | "back">("fwd");
  const [anchorDate, setAnchorDate] = useState(() => fmtISO(new Date()));
  const [bufferDays, setBufferDays] = useState(0);

  if (activeModal !== "plan") return null;

  const selectedTemplate =
    PROJECT_TEMPLATES.find((tpl) => tpl.id === selectedId) ||
    PROJECT_TEMPLATES[0];

  const handleApply = () => {
    const patch = generatePlannedPage({
      template: selectedTemplate,
      mode,
      anchorDateISO: anchorDate,
      bufferDays,
      lang,
      basePage: activePage,
    });
    updateActivePage(patch, true);
    closeModal();
  };

  return (
    <div
      className="fixed inset-0 z-[2000] bg-[#09140E]/45 backdrop-blur-[3px] flex items-center justify-center p-5"
      onClick={closeModal}
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-dlg-title"
    >
      <div
        className="bg-white rounded-[18px] shadow-2xl w-full max-w-[660px] max-h-[calc(100vh-40px)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line)]">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[var(--accent-50)] text-[var(--accent-600)] grid place-items-center">
              <Icon name="sparkle" />
            </span>
            <div>
              <h2 id="plan-dlg-title" className="font-extrabold text-[15px]">
                {lang === "en"
                  ? "Templates & Schedule Wizard"
                  : "Template & Wizard Jadwal Proyek"}
              </h2>
              <p className="text-[11.5px] text-[var(--muted)]">
                {lang === "en"
                  ? "Pick a template and set your start or target go-live date"
                  : "Pilih template dan tentukan tanggal mulai atau target go-live"}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="ibtn"
            aria-label="Close"
            onClick={closeModal}
          >
            <Icon name="x" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4 overflow-y-auto">
          {/* 4 Templates Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {PROJECT_TEMPLATES.map((tpl) => {
              const isSelected = tpl.id === selectedId;
              const taskTotal = tpl.groups.reduce(
                (s, g) => s + g.tasks.length,
                0
              );
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setSelectedId(tpl.id)}
                  className={`text-left p-3.5 rounded-xl border transition-all flex flex-col gap-1.5 ${
                    isSelected
                      ? "border-[var(--brand)] bg-[var(--brand-50)] ring-1 ring-[var(--brand)]"
                      : "border-[var(--line)] bg-white hover:border-[var(--brand-200)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-[13px] text-[var(--ink)] flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: tpl.accent }}
                      />
                      {tpl.name[lang]}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-[var(--line)] text-[var(--muted)]">
                      {tpl.groups.length} group · {taskTotal} task
                    </span>
                  </div>
                  <div className="text-[11.5px] font-bold text-[var(--ink-2)]">
                    {tpl.exampleTitle[lang]}
                  </div>
                  <div className="text-[11px] text-[var(--muted)] leading-snug">
                    {tpl.desc[lang]}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Forward / Backward Scheduling */}
          <div className="border border-[var(--line)] rounded-xl p-3.5 bg-[#FAFBF9] flex flex-col gap-3">
            <div className="row2">
              <div className="fg">
                <label>
                  {lang === "en" ? "Scheduling direction" : "Arah penjadwalan"}
                </label>
                <div className="dm-seg">
                  <button
                    type="button"
                    className="btn sm"
                    aria-pressed={mode === "fwd"}
                    onClick={() => setMode("fwd")}
                  >
                    <span>
                      {lang === "en" ? "Forward" : "Maju dari mulai"}
                    </span>
                    <small>
                      {lang === "en" ? "From kickoff date" : "Dari tanggal mulai"}
                    </small>
                  </button>
                  <button
                    type="button"
                    className="btn sm"
                    aria-pressed={mode === "back"}
                    onClick={() => setMode("back")}
                  >
                    <span>
                      {lang === "en" ? "Backward" : "Mundur dari target"}
                    </span>
                    <small>
                      {lang === "en" ? "From target date" : "Dari tanggal go-live"}
                    </small>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="fg">
                  <label htmlFor="plan-anchor">
                    {mode === "back"
                      ? lang === "en"
                        ? "Target Go-Live Date"
                        : "Tanggal Target Selesai"
                      : lang === "en"
                        ? "Kickoff Start Date"
                        : "Tanggal Mulai Proyek"}
                  </label>
                  <input
                    id="plan-anchor"
                    type="date"
                    className="inp sm"
                    value={anchorDate}
                    onChange={(e) => setAnchorDate(e.target.value)}
                  />
                </div>
                <div className="fg">
                  <label htmlFor="plan-buf">
                    {lang === "en"
                      ? "Working-day buffer (WD)"
                      : "Buffer hari kerja (HK)"}
                  </label>
                  <input
                    id="plan-buf"
                    type="number"
                    min={0}
                    max={60}
                    className="inp sm"
                    value={bufferDays}
                    onChange={(e) =>
                      setBufferDays(Math.max(0, Math.min(60, Number(e.target.value) || 0)))
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-[var(--line)] bg-[#F7FAF8] flex items-center justify-end gap-2">
          <button type="button" className="btn" onClick={closeModal}>
            {lang === "en" ? "Cancel" : "Batal"}
          </button>
          <button type="button" className="btn primary" onClick={handleApply}>
            <Icon name="sparkle" />
            <span>
              {lang === "en" ? "Generate Timeline" : "Buat Timeline"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
