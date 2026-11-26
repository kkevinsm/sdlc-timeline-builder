"use client";

import React, { useMemo, useState } from "react";
import { Icon } from "@/components/IconSprite";
import { SLIDE_STYLE_DEFS, type ExportOptions } from "@/constants/styles";
import { buildTimelineModel } from "@/engine/layoutModel";
import { exportTimelineToPng } from "@/export/pngExporter";
import { exportProjectToPptx } from "@/export/pptxExporter";
import { useTimeline } from "@/store/useTimelineStore";
import type { SlideStyleId } from "@/types/timeline";

const STYLE_ORDER: SlideStyleId[] = [
  "standar",
  "simple",
  "it",
  "release",
  "management",
];

export function ExportModal() {
  const { activeModal, activePage } = useTimeline();
  if (activeModal !== "export") return null;
  return <ExportModalInner key={activePage.id} />;
}

function ExportModalInner() {
  const { project, activePage, closeModal, lang, showNotice } =
    useTimeline();

  const [style, setStyle] = useState<SlideStyleId>(
    activePage.style || "standar"
  );
  const [font, setFont] = useState<ExportOptions["font"]>("Calibri");
  const [expLang, setExpLang] = useState<"id" | "en">(lang);
  const [includeSummary, setIncludeSummary] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [showDuration, setShowDuration] = useState(true);
  const [showStatus, setShowStatus] = useState(true);
  const [showOwner, setShowOwner] = useState(activePage.showOwner);
  const [showDeps, setShowDeps] = useState(activePage.showDeps);
  const [showToday, setShowToday] = useState(activePage.showToday);
  const [showLegend, setShowLegend] = useState(activePage.showLegend);
  const [showRail, setShowRail] = useState(activePage.msRail);
  const [selectedPageIds, setSelectedPageIds] = useState<number[]>(() =>
    project.pages.map((p) => p.id)
  );
  const [busy, setBusy] = useState(false);

  const activeModel = useMemo(
    () => buildTimelineModel(activePage, project.mode, expLang),
    [activePage, project.mode, expLang]
  );

  const applyStylePreset = (id: SlideStyleId) => {
    setStyle(id);
    const def = SLIDE_STYLE_DEFS[id].defaults;
    if (def.showDuration !== undefined) setShowDuration(def.showDuration);
    if (def.showStatus !== undefined) setShowStatus(def.showStatus);
    if (def.showOwner !== undefined) setShowOwner(def.showOwner);
    if (def.showDeps !== undefined) setShowDeps(def.showDeps);
    if (def.showToday !== undefined) setShowToday(def.showToday);
    if (def.showLegend !== undefined) setShowLegend(def.showLegend);
    if (def.showRail !== undefined) setShowRail(def.showRail);
    if (def.includeSummary !== undefined) setIncludeSummary(def.includeSummary);
    if (def.includeNotes !== undefined) setIncludeNotes(def.includeNotes);
  };

  const togglePageId = (id: number) => {
    setSelectedPageIds((prev) => {
      if (prev.includes(id)) {
        return prev.length > 1 ? prev.filter((x) => x !== id) : prev;
      }
      return [...prev, id];
    });
  };

  const handleExportPptx = async () => {
    setBusy(true);
    try {
      await exportProjectToPptx(project, {
        style,
        font,
        lang: expLang,
        includeSummary,
        includeNotes,
        showDuration,
        showStatus,
        showOwner,
        showDeps,
        showToday,
        showLegend,
        showRail,
        pageIds:
          selectedPageIds.length > 0
            ? selectedPageIds
            : project.pages.map((p) => p.id),
      });
      showNotice(
        lang === "en"
          ? "PowerPoint (.pptx) downloaded!"
          : "File PowerPoint (.pptx) berhasil diunduh!"
      );
      closeModal();
    } catch (err) {
      console.error(err);
      showNotice(
        lang === "en"
          ? "Failed to generate PPTX."
          : "Gagal membuat file PowerPoint."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleExportPng = () => {
    const safeName = (activePage.title || "timeline")
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-");
    exportTimelineToPng(activeModel, expLang, `${safeName}.png`, {
      showDuration,
      showStatus,
      showOwner,
      showDeps,
      showToday,
      showLegend,
      showRail,
    });
    showNotice(
      lang === "en" ? "PNG downloaded!" : "Gambar PNG berhasil diunduh!"
    );
  };

  return (
    <div
      className="fixed inset-0 z-[2000] bg-[#09140E]/45 backdrop-blur-[3px] flex items-center justify-center p-5"
      onClick={closeModal}
      role="dialog"
      aria-modal="true"
      aria-labelledby="exp-dlg-title"
    >
      <div
        className="bg-white rounded-[18px] shadow-2xl w-full max-w-[780px] max-h-[calc(100vh-40px)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line)]">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[var(--accent-50)] text-[var(--accent-600)] grid place-items-center">
              <Icon name="present" />
            </span>
            <div>
              <h2 id="exp-dlg-title" className="font-extrabold text-[15px]">
                {lang === "en"
                  ? "Export PowerPoint & PNG (Full Pro)"
                  : "Export PowerPoint & PNG (Full Pro)"}
              </h2>
              <p className="text-[11.5px] text-[var(--muted)]">
                {lang === "en"
                  ? "Every bar, label, arrow, and milestone is exported as editable native shapes"
                  : "Setiap bar, teks, panah, dan milestone diekspor sebagai shape PowerPoint asli yang bisa diedit"}
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

        {/* Body */}
        <div className="p-5 flex flex-col gap-4 overflow-y-auto">
          {/* 5 Slide Styles */}
          <div className="fg">
            <label>{lang === "en" ? "Slide Style" : "Gaya Slide"}</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {STYLE_ORDER.map((id) => {
                const def = SLIDE_STYLE_DEFS[id];
                const on = style === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => applyStylePreset(id)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                      on
                        ? "border-[var(--brand)] bg-[var(--brand-50)] text-[var(--brand-700)] ring-1 ring-[var(--brand)]"
                        : "border-[var(--line)] bg-white hover:border-[var(--brand-200)]"
                    }`}
                  >
                    <span className="font-extrabold text-[12px]">
                      {def.name[lang]}
                    </span>
                    <span className="text-[10px] text-[var(--muted)] leading-tight">
                      {def.desc[lang]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-[var(--line)] rounded-xl p-3.5 flex flex-col gap-2.5">
              <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
                {lang === "en" ? "Slide Content" : "Isi Slide"}
              </div>
              {(
                [
                  [includeSummary, setIncludeSummary, lang === "en" ? "Executive Summary Slide" : "Slide Ringkasan Eksekutif"],
                  [includeNotes, setIncludeNotes, lang === "en" ? "Speaker Notes" : "Speaker Notes Otomatis"],
                  [showDuration, setShowDuration, lang === "en" ? "Duration & Working Days" : "Kolom Durasi & Hari Kerja"],
                  [showStatus, setShowStatus, lang === "en" ? "Status Column" : "Kolom Status & Progress"],
                  [showOwner, setShowOwner, lang === "en" ? "PIC / Owner Column" : "Kolom PIC / Owner"],
                  [showDeps, setShowDeps, lang === "en" ? "Dependency Arrows" : "Panah Dependency"],
                  [showToday, setShowToday, lang === "en" ? "Today / Current Week Line" : "Garis Hari Ini"],
                  [showRail, setShowRail, lang === "en" ? "Milestone Rail" : "Rel Milestone"],
                ] as const
              ).map(([checked, setter, label], idx) => (
                <label key={idx} className="cbx">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => setter(e.target.checked)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>

            <div className="border border-[var(--line)] rounded-xl p-3.5 flex flex-col gap-3">
              <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
                {lang === "en" ? "Format & Pages" : "Format & Halaman"}
              </div>
              <div className="row2">
                <div className="fg">
                  <label>Font</label>
                  <select
                    className="inp sm"
                    value={font}
                    onChange={(e) =>
                      setFont(e.target.value as ExportOptions["font"])
                    }
                  >
                    <option value="Calibri">Calibri</option>
                    <option value="Arial">Arial</option>
                    <option value="Segoe UI">Segoe UI</option>
                  </select>
                </div>
                <div className="fg">
                  <label>{lang === "en" ? "Slide Language" : "Bahasa Slide"}</label>
                  <select
                    className="inp sm"
                    value={expLang}
                    onChange={(e) => setExpLang(e.target.value as "id" | "en")}
                  >
                    <option value="id">Indonesia</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>

              <div className="fg">
                <label>
                  {lang === "en"
                    ? "Pages to export"
                    : "Halaman yang diexport"}
                </label>
                <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto">
                  {project.pages.map((p) => (
                    <label key={p.id} className="cbx">
                      <input
                        type="checkbox"
                        checked={selectedPageIds.includes(p.id)}
                        onChange={() => togglePageId(p.id)}
                      />
                      <span className="truncate">{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[var(--line)] bg-[#F7FAF8] flex items-center justify-between gap-2 flex-wrap">
          <button type="button" className="btn" onClick={handleExportPng}>
            <Icon name="image" />
            <span>{lang === "en" ? "Download PNG" : "Unduh PNG"}</span>
          </button>

          <div className="flex items-center gap-2">
            <button type="button" className="btn" onClick={closeModal}>
              {lang === "en" ? "Cancel" : "Batal"}
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={busy}
              onClick={handleExportPptx}
            >
              <Icon name="download" />
              <span>
                {busy
                  ? lang === "en"
                    ? "Generating..."
                    : "Menyiapkan..."
                  : lang === "en"
                    ? "Download PowerPoint (.pptx)"
                    : "Unduh PowerPoint (.pptx)"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
