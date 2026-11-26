"use client";

import React from "react";
import { Icon } from "@/components/IconSprite";
import { useTimeline } from "@/store/useTimelineStore";

export function HelpModal() {
  const { activeModal, closeModal, lang } = useTimeline();

  if (activeModal !== "help") return null;

  const shortcuts: [string, string][] = [
    ["G", lang === "en" ? "Add new group" : "Tambah group baru"],
    ["T", lang === "en" ? "Add new task" : "Tambah task baru"],
    ["L", lang === "en" ? "Paste task list (up to 200 rows)" : "Tempel daftar task (maks 200 baris)"],
    ["B", lang === "en" ? "Toggle sidebar panel" : "Sembunyikan / tampilkan panel"],
    ["P", lang === "en" ? "Presentation mode" : "Mode presentasi layar penuh"],
    ["Ctrl/⌘ + Z", "Undo"],
    ["Ctrl/⌘ + Y", "Redo"],
    ["Ctrl/⌘ + S", lang === "en" ? "Save project JSON" : "Simpan project JSON"],
    ["Ctrl/⌘ + O", lang === "en" ? "Open project JSON" : "Buka project JSON"],
    ["Ctrl/⌘ + E", lang === "en" ? "Open Export PPT / PNG" : "Buka dialog Export PPT / PNG"],
    ["?", lang === "en" ? "Show shortcuts & tips" : "Tampilkan shortcut & tips"],
  ];

  return (
    <div
      className="fixed inset-0 z-[2000] bg-[#09140E]/45 backdrop-blur-[3px] flex items-center justify-center p-5"
      onClick={closeModal}
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-dlg-title"
    >
      <div
        className="bg-white rounded-[18px] shadow-2xl w-full max-w-[480px] max-h-[calc(100vh-40px)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line)]">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[var(--brand-50)] text-[var(--brand-700)] grid place-items-center">
              <Icon name="keyboard" />
            </span>
            <div>
              <h2 id="help-dlg-title" className="font-extrabold text-[15px]">
                {lang === "en" ? "Keyboard Shortcuts & Tips" : "Shortcut Keyboard & Tips"}
              </h2>
              <p className="text-[11.5px] text-[var(--muted)]">
                Timeline Builder Online
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

        <div className="p-5 flex flex-col gap-2 overflow-y-auto">
          {shortcuts.map(([key, desc]) => (
            <div
              key={key}
              className="flex items-center justify-between gap-3 py-1.5 border-b border-[var(--line-2)] last:border-b-0 text-[12.5px]"
            >
              <span className="text-[var(--ink-2)] font-medium">{desc}</span>
              <kbd className="px-2 py-0.5 rounded-md border border-[#D3DCD6] bg-[#FAFBF9] font-mono text-[11px] font-bold text-[var(--ink)]">
                {key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-[var(--line)] bg-[#F7FAF8] flex justify-end">
          <button type="button" className="btn primary" onClick={closeModal}>
            {lang === "en" ? "Got it" : "Mengerti"}
          </button>
        </div>
      </div>
    </div>
  );
}
