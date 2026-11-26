"use client";

import React, { useState } from "react";
import { Icon } from "@/components/IconSprite";
import { todayISO_UTC7 } from "@/constants/defaults";
import {
  generatePlannedPage,
  PROJECT_TEMPLATES,
  type ProjectTemplate,
} from "@/constants/templates";
import { useTimeline } from "@/store/useTimelineStore";

function MiniGanttThumb({ accent }: { accent: string }) {
  return (
    <svg
      width="74"
      height="42"
      viewBox="0 0 74 42"
      fill="none"
      className="rounded border border-[#E5EAE7] bg-white shrink-0"
      aria-hidden="true"
    >
      <rect x="0" y="0" width="74" height="7" fill={accent} />
      <rect x="4" y="11" width="20" height="3.5" rx="1.75" fill={accent} opacity="0.35" />
      <rect x="4" y="11" width="14" height="3.5" rx="1.75" fill={accent} />
      <rect x="18" y="17" width="22" height="3.5" rx="1.75" fill={accent} opacity="0.35" />
      <rect x="18" y="17" width="12" height="3.5" rx="1.75" fill={accent} />
      <rect x="34" y="23" width="18" height="3.5" rx="1.75" fill={accent} opacity="0.45" />
      <rect x="46" y="29" width="22" height="3.5" rx="1.75" fill={accent} opacity="0.3" />
      <rect x="46" y="29" width="8" height="3.5" rx="1.75" fill={accent} />
      <circle cx="68" cy="36" r="2" fill="#E09200" />
    </svg>
  );
}

export function PlanWizardModal() {
  const { activePage, activeModal, closeModal, lang, updateActivePage } =
    useTimeline();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedId, setSelectedId] = useState<ProjectTemplate["id"]>("it");
  const [mode, setMode] = useState<"fwd" | "back">("fwd");
  const [anchorDate, setAnchorDate] = useState(() => todayISO_UTC7());
  const [bufferDays, setBufferDays] = useState(0);

  if (activeModal !== "plan") return null;

  const selectedTemplate =
    PROJECT_TEMPLATES.find((tpl) => tpl.id === selectedId) ||
    PROJECT_TEMPLATES[0];

  const handleClose = () => {
    setStep(1);
    closeModal();
  };

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
    setStep(1);
    closeModal();
  };

  const stepLabels = [
    { n: 1 as const, label: lang === "en" ? "Template" : "Template" },
    { n: 2 as const, label: lang === "en" ? "Tasks" : "Task" },
    { n: 3 as const, label: lang === "en" ? "Schedule" : "Jadwal" },
  ];

  return (
    <div
      className="fixed inset-0 z-[2000] bg-[#09140E]/45 backdrop-blur-[3px] flex items-center justify-center p-5"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-dlg-title"
    >
      <div
        className="bg-white rounded-[18px] shadow-2xl w-full max-w-[780px] max-h-[calc(100vh-40px)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with 3-step Stepper */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-[var(--line)]">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-[var(--brand-50)] text-[var(--brand)] grid place-items-center shrink-0">
              <Icon name="sparkle" />
            </span>
            <div className="min-w-0">
              <h2 id="plan-dlg-title" className="font-extrabold text-[15px] leading-tight">
                {lang === "en" ? "Schedule templates" : "Template jadwal"}
              </h2>
              <p className="text-[11.5px] text-[var(--muted)]">
                {lang === "en"
                  ? "Choose a project type."
                  : "Pilih tipe proyek Anda."}
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 ml-auto mr-2">
            {stepLabels.map((s, idx) => {
              const isCurrent = step === s.n;
              const isDone = step > s.n;
              return (
                <React.Fragment key={s.n}>
                  {idx > 0 && <span className="w-4 h-px bg-[var(--line)]" />}
                  <button
                    type="button"
                    onClick={() => setStep(s.n)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-bold transition ${
                      isCurrent
                        ? "bg-[var(--brand-50)] text-[var(--brand-700)] ring-1 ring-[var(--brand-200)]"
                        : isDone
                          ? "text-[var(--brand-700)]"
                          : "text-[var(--muted)]"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full grid place-items-center text-[10.5px] font-extrabold ${
                        isCurrent || isDone
                          ? "bg-[var(--brand)] text-white"
                          : "bg-[#EDF1EE] text-[var(--muted)]"
                      }`}
                    >
                      {s.n}
                    </span>
                    <span>{s.label}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          <button
            type="button"
            className="ibtn"
            aria-label="Close"
            onClick={handleClose}
          >
            <Icon name="x" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-4 overflow-y-auto">
          {step === 1 && (
            <>
              <p className="text-[12px] text-[var(--muted)] m-0">
                {lang === "en"
                  ? "The schedule is calculated from your target or start date, following work days, holidays, and task order."
                  : "Jadwal dihitung otomatis dari tanggal mulai atau target go-live, mengikuti hari kerja, libur, dan urutan task."}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {PROJECT_TEMPLATES.map((tpl) => {
                  const taskTotal = tpl.groups.reduce(
                    (s, g) => s + g.tasks.length,
                    0
                  );
                  const msCount = tpl.groups.reduce(
                    (s, g) => s + g.tasks.filter((t) => t.ms).length,
                    0
                  );
                  const totalHK = tpl.groups.reduce(
                    (s, g) =>
                      s + g.tasks.reduce((ts, t) => ts + t.durationHK, 0),
                    0
                  );
                  const approxWeeks = Math.max(1, Math.round(totalHK / 5));

                  return (
                    <div
                      key={tpl.id}
                      className="rounded-2xl border border-[var(--line)] bg-white overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow"
                      style={{ borderTop: `3px solid ${tpl.accent}` }}
                    >
                      <div className="p-4 flex flex-col gap-2.5 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase"
                            style={{
                              background: `${tpl.accent}1A`,
                              color: tpl.accent,
                            }}
                          >
                            {tpl.name[lang]}
                          </span>
                          <MiniGanttThumb accent={tpl.accent} />
                        </div>

                        <div className="font-extrabold text-[14px] text-[var(--ink)] leading-snug">
                          {tpl.exampleTitle[lang]}
                        </div>

                        <p className="text-[11.5px] text-[var(--muted)] leading-relaxed m-0 flex-1">
                          {tpl.desc[lang]}
                        </p>

                        <div className="flex items-center flex-wrap gap-3 text-[11px] font-semibold text-[var(--ink-2)] pt-1">
                          <span className="inline-flex items-center gap-1">
                            <Icon name="rows" size="xs" className="text-[var(--muted)]" />
                            <span>
                              {taskTotal} {lang === "en" ? "tasks" : "task"}
                            </span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span style={{ color: tpl.accent }} className="inline-flex">
                              <Icon name="diamond" size="xs" />
                            </span>
                            <span>
                              {msCount} {lang === "en" ? "milestone(s)" : "milestone"}
                            </span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Icon name="calendar" size="xs" className="text-[var(--muted)]" />
                            <span>
                              ~{approxWeeks} {lang === "en" ? "weeks" : "minggu"}
                            </span>
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1.5">
                          <button
                            type="button"
                            className="btn sm"
                            onClick={() => {
                              setSelectedId(tpl.id);
                              setStep(2);
                            }}
                          >
                            {lang === "en" ? "Preview" : "Pratinjau"}
                          </button>
                          <button
                            type="button"
                            className="btn sm primary"
                            onClick={() => {
                              setSelectedId(tpl.id);
                              setStep(3);
                            }}
                          >
                            {lang === "en" ? "Use template" : "Gunakan template"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-extrabold text-[14px] text-[var(--ink)]">
                    {selectedTemplate.exampleTitle[lang]}
                  </div>
                  <div className="text-[11.5px] text-[var(--muted)]">
                    {selectedTemplate.subtitle[lang]}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn sm primary"
                  onClick={() => setStep(3)}
                >
                  {lang === "en" ? "Use template" : "Gunakan template"}
                </button>
              </div>

              <div className="border border-[var(--line)] rounded-xl divide-y divide-[var(--line-2)] overflow-hidden">
                {selectedTemplate.groups.map((grp, gi) => (
                  <div key={gi}>
                    <div className="px-3.5 py-2 bg-[#F2F7F4] font-extrabold text-[12px] text-[var(--brand-800)]">
                      {grp.name[lang]}
                    </div>
                    <div className="divide-y divide-[var(--line-2)]">
                      {grp.tasks.map((tk, ti) => (
                        <div
                          key={ti}
                          className="px-3.5 py-2 flex items-center justify-between gap-3 text-[12px]"
                        >
                          <span className="flex items-center gap-2 font-medium text-[var(--ink)]">
                            {tk.ms && (
                              <span className="text-[#E09200]">★</span>
                            )}
                            <span>{tk.name[lang]}</span>
                          </span>
                          <span className="text-[11px] font-bold text-[var(--muted)] shrink-0">
                            {tk.owner ? `${tk.owner} · ` : ""}
                            {tk.durationHK} {lang === "en" ? "WD" : "HK"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-3.5">
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[var(--brand-50)] border border-[var(--brand-200)]">
                <div>
                  <div className="font-extrabold text-[13px] text-[var(--brand-800)]">
                    {selectedTemplate.exampleTitle[lang]}
                  </div>
                  <div className="text-[11px] text-[var(--brand-700)]">
                    {selectedTemplate.subtitle[lang]}
                  </div>
                </div>
                <span
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase text-white"
                  style={{ background: selectedTemplate.accent }}
                >
                  {selectedTemplate.name[lang]}
                </span>
              </div>

              {/* Forward / Backward Scheduling */}
              <div className="border border-[var(--line)] rounded-xl p-4 bg-[#FAFBF9] flex flex-col gap-3">
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
                          setBufferDays(
                            Math.max(0, Math.min(60, Number(e.target.value) || 0))
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[var(--line)] bg-[#F7FAF8] flex items-center justify-between gap-2">
          <button
            type="button"
            className="btn"
            onClick={() => {
              if (step === 1) handleClose();
              else if (step === 3) setStep(1);
              else setStep(1);
            }}
          >
            <Icon name="left" size="xs" />
            <span>{lang === "en" ? "Back" : "Kembali"}</span>
          </button>

          <div className="flex items-center gap-2">
            <button type="button" className="btn" onClick={handleClose}>
              {lang === "en" ? "Cancel" : "Batal"}
            </button>
            {step === 3 && (
              <button type="button" className="btn primary" onClick={handleApply}>
                <Icon name="sparkle" />
                <span>
                  {lang === "en" ? "Generate Timeline" : "Buat Timeline"}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
