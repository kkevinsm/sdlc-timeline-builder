"use client";

import React, { useMemo, useState } from "react";
import { Icon } from "@/components/IconSprite";
import {
  buildRowsFromPaste,
  LIST_MAX,
  parsePasteList,
} from "@/engine/pasteParser";
import { useTimeline } from "@/store/useTimelineStore";

export function BulkPasteModal() {
  const { activePage, activeModal, closeModal, lang, appendRows } =
    useTimeline();
  const [text, setText] = useState("");

  const parsed = useMemo(
    () => parsePasteList(text, activePage.year || new Date().getFullYear()),
    [text, activePage.year]
  );

  if (activeModal !== "paste") return null;

  const handleApply = () => {
    if (parsed.length === 0) return;
    const newRows = buildRowsFromPaste(parsed, activePage);
    appendRows(newRows);
    setText("");
    closeModal();
  };

  return (
    <div
      className="fixed inset-0 z-[2000] bg-[#09140E]/45 backdrop-blur-[3px] flex items-center justify-center p-5"
      onClick={closeModal}
      role="dialog"
      aria-modal="true"
      aria-labelledby="paste-dlg-title"
    >
      <div
        className="bg-white rounded-[18px] shadow-2xl w-full max-w-[580px] max-h-[calc(100vh-40px)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line)]">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[var(--brand-50)] text-[var(--brand-700)] grid place-items-center">
              <Icon name="list" />
            </span>
            <div>
              <h2 id="paste-dlg-title" className="font-extrabold text-[15px]">
                {lang === "en"
                  ? "Add multiple tasks from list"
                  : "Tambah banyak task dari daftar"}
              </h2>
              <p className="text-[11.5px] text-[var(--muted)]">
                {lang === "en"
                  ? `Paste from notes or Excel/Sheets (max ${LIST_MAX} rows)`
                  : `Tempel dari catatan atau Excel/Sheets (maks. ${LIST_MAX} baris)`}
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

        <div className="p-5 flex flex-col gap-3 overflow-y-auto">
          <textarea
            className="w-full h-44 p-3 rounded-xl border border-[#D3DCD6] text-[12.5px] font-mono leading-relaxed focus:outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/15 resize-y"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              lang === "en"
                ? "Example:\n- Kickoff & Discovery\n- System Architecture\nOr paste from Excel (Name [Tab] Start Date [Tab] End Date [Tab] PIC)"
                : "Contoh:\n- Kickoff & Discovery\n- Desain Arsitektur\nAtau tempel langsung dari Excel (Nama [Tab] Tgl Mulai [Tab] Tgl Selesai [Tab] PIC)"
            }
            autoFocus
          />

          <div className="flex items-center justify-between text-[11.5px] text-[var(--muted)]">
            <span>
              {parsed.length > 0
                ? `${parsed.length} ${lang === "en" ? "task(s) detected" : "task terdeteksi"}`
                : lang === "en"
                  ? "One line = one task. Bullets & numbering are cleaned automatically."
                  : "Satu baris = satu task. Bullet & penomoran dibersihkan otomatis."}
            </span>
            {parsed.some((p) => p.sd) && (
              <span className="font-bold text-[var(--brand-700)] bg-[var(--brand-50)] px-2 py-0.5 rounded-full">
                {lang === "en" ? "Dates detected" : "Tanggal terdeteksi"}
              </span>
            )}
          </div>

          {parsed.length > 0 && (
            <div className="max-h-36 overflow-y-auto border border-[var(--line)] rounded-xl divide-y divide-[var(--line-2)]">
              {parsed.slice(0, 8).map((item, i) => (
                <div
                  key={i}
                  className="px-3 py-1.5 flex items-center justify-between gap-2 text-[12px]"
                >
                  <span className="font-semibold truncate">{item.name}</span>
                  <span className="text-[11px] text-[var(--muted)] shrink-0">
                    {item.sd ? `${item.sd} → ${item.ed}` : "1W auto"}
                    {item.owner ? ` · ${item.owner}` : ""}
                  </span>
                </div>
              ))}
              {parsed.length > 8 && (
                <div className="px-3 py-1.5 text-[11px] text-[var(--muted)] text-center">
                  +{parsed.length - 8} {lang === "en" ? "more" : "lainnya"}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-[var(--line)] bg-[#F7FAF8] flex items-center justify-end gap-2">
          <button type="button" className="btn" onClick={closeModal}>
            {lang === "en" ? "Cancel" : "Batal"}
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={parsed.length === 0}
            onClick={handleApply}
          >
            <Icon name="plus" />
            <span>
              {lang === "en"
                ? `Add ${parsed.length || ""} tasks`
                : `Tambahkan ${parsed.length || ""} task`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
