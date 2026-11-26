"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/IconSprite";
import {
  getProjectChanges,
  restoreProjectSnapshot,
  type ProjectChangeItem,
} from "@/lib/authClient";
import { useTimeline } from "@/store/useTimelineStore";

function formatRelativeTime(iso: string, lang: "id" | "en"): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.max(0, Math.floor(diffMs / 1000));
  if (sec < 60) return lang === "en" ? "Just now" : "Baru saja";
  const min = Math.floor(sec / 60);
  if (min < 60) return lang === "en" ? `${min} min ago` : `${min} mnt lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return lang === "en" ? `${hr} hr ago` : `${hr} jam lalu`;
  return new Date(iso).toLocaleString(lang === "en" ? "en-US" : "id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (name.trim()[0] || "U").toUpperCase();
}

export function ChangesDrawer() {
  const {
    activeModal,
    closeModal,
    cloudProjectId,
    activeWorkspaceId,
    cloudProjectRole,
    cloudProjectVersion,
    openCloudProject,
    showNotice,
    activePage,
    lang,
  } = useTimeline();

  const [scope, setScope] = useState<"all" | "page">("all");
  const [changes, setChanges] = useState<ProjectChangeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!cloudProjectId) {
      setChanges([]);
      return;
    }
    setLoading(true);
    try {
      const list = await getProjectChanges(
        cloudProjectId,
        scope === "page" ? activePage.id : null
      );
      setChanges(list);
    } catch {
      setChanges([]);
    } finally {
      setLoading(false);
    }
  }, [activePage.id, cloudProjectId, scope]);

  useEffect(() => {
    if (activeModal !== "changes") return;
    const id = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(id);
  }, [activeModal, cloudProjectVersion, load]);

  if (activeModal !== "changes") return null;

  return (
    <div
      className="fixed inset-0 z-[1900] bg-[#1A0D06]/25 backdrop-blur-[1px] flex justify-end"
      onClick={closeModal}
      role="dialog"
      aria-modal="true"
      aria-labelledby="changes-drawer-title"
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[380px] h-full bg-[#F8F6F4] border-l border-[var(--line)] shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-white border-b border-[var(--line)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-[var(--brand-50)] text-[var(--brand-700)] grid place-items-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                <path d="M3 3v5h5" />
                <path d="M12 7v5l3 2" />
              </svg>
            </span>
            <h2
              id="changes-drawer-title"
              className="font-extrabold text-[15.5px] text-[var(--ink)]"
            >
              {lang === "en" ? "Changes" : "Riwayat Perubahan"}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void load()}
              className="ibtn sm"
              title={lang === "en" ? "Refresh" : "Muat ulang"}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                <path d="M21 3v6h-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={closeModal}
              className="ibtn sm"
              aria-label="Close"
            >
              <Icon name="x" size="sm" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-4 py-2.5 bg-white border-b border-[var(--line-2)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[12.5px] font-semibold text-[var(--ink-2)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M7 12h10M10 18h4" />
            </svg>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as "all" | "page")}
              className="bg-transparent font-semibold text-[12.5px] text-[var(--ink)] outline-none cursor-pointer"
            >
              <option value="all">
                {lang === "en" ? "This timeline (All pages)" : "Semua halaman"}
              </option>
              <option value="page">
                {lang === "en"
                  ? `Page: ${activePage.name}`
                  : `Halaman: ${activePage.name}`}
              </option>
            </select>
          </div>
          <span className="text-[11px] font-semibold text-[var(--muted)]">
            {changes.length} {lang === "en" ? "edits" : "ubah"}
          </span>
        </div>

        {/* Change Cards */}
        <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-2.5">
          {loading && changes.length === 0 ? (
            <div className="py-12 text-center text-[12.5px] text-[var(--muted)]">
              {lang === "en" ? "Loading changes..." : "Memuat riwayat perubahan..."}
            </div>
          ) : changes.length === 0 ? (
            <div className="py-12 px-4 text-center text-[12.5px] text-[var(--muted)] bg-white rounded-2xl border border-dashed border-[var(--line)]">
              {lang === "en"
                ? "No recorded edits yet. Any changes you or teammates make will appear here."
                : "Belum ada riwayat perubahan tercatat. Setiap edit Anda atau rekan tim akan muncul di sini."}
            </div>
          ) : (
            changes.map((ch) => (
              <div
                key={ch.id}
                className="bg-white rounded-2xl border border-[var(--line)] p-3.5 shadow-sm flex flex-col gap-2.5"
              >
                {/* Author + Timestamp */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-7 h-7 rounded-full bg-[var(--brand-100)] text-[var(--brand-800)] font-extrabold text-[11px] grid place-items-center shrink-0">
                      {initialsOf(ch.userName)}
                    </span>
                    <span className="text-[13px] font-bold text-[var(--ink)] truncate">
                      {ch.userName}
                    </span>
                  </div>
                  <span className="text-[11px] text-[var(--muted)] shrink-0">
                    {formatRelativeTime(ch.createdAt, lang)}
                  </span>
                </div>

                {/* Action Line */}
                <div className="flex items-center gap-1.5 text-[12px] text-[var(--ink-2)] flex-wrap">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-[var(--muted)] shrink-0"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                  <span className="truncate max-w-[200px]">
                    {lang === "en" ? "Edited" : "Mengedit"}{" "}
                    <b className="text-[var(--ink)]">{ch.targetLabel}</b>
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-[#F1EFEA] text-[#4A443F] font-bold text-[10.5px] shrink-0">
                    {ch.fieldLabel}
                  </span>
                </div>

                {/* Vertical New -> Old Diff Connector */}
                <div className="pl-2 flex flex-col gap-1 text-[12px]">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-1 w-3.5 h-3.5 rounded-full border border-[var(--brand)] grid place-items-center shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)]" />
                    </span>
                    <span className="font-semibold text-[var(--ink)] break-words">
                      {ch.newValue || "—"}
                    </span>
                  </div>
                  <div className="ml-[6px] h-2.5 border-l border-dashed border-[#C7C2BC]" />
                  <div className="flex items-start gap-2.5">
                    <span className="mt-1 w-3.5 h-3.5 grid place-items-center shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF]" />
                    </span>
                    <span className="text-[var(--muted)] line-through break-words">
                      {ch.oldValue || "—"}
                    </span>
                  </div>
                </div>

                {Boolean(ch.hasSnapshot) && cloudProjectRole !== "viewer" && (
                  <div className="pt-1 border-t border-[var(--line-2)] flex justify-end">
                    <button
                      type="button"
                      disabled={restoringId === ch.id}
                      onClick={async () => {
                        if (!cloudProjectId) return;
                        setRestoringId(ch.id);
                        try {
                          const res = await restoreProjectSnapshot(
                            cloudProjectId,
                            ch.id
                          );
                          openCloudProject({
                            id: res.id,
                            workspaceId: activeWorkspaceId,
                            role: cloudProjectRole,
                            version: res.version,
                            data: res.data,
                          });
                          showNotice(
                            lang === "en"
                              ? "Version restored!"
                              : "Versi berhasil dipulihkan!"
                          );
                          await load();
                        } catch (err) {
                          const msg =
                            err instanceof Error
                              ? err.message
                              : lang === "en"
                                ? "Failed to restore version."
                                : "Gagal memulihkan versi.";
                          showNotice(msg);
                        } finally {
                          setRestoringId(null);
                        }
                      }}
                      className="btn xs soft text-[11px]"
                    >
                      {restoringId === ch.id
                        ? lang === "en"
                          ? "Restoring..."
                          : "Memulihkan..."
                        : lang === "en"
                          ? "Restore this version"
                          : "Pulihkan versi ini"}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
