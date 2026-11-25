"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/IconSprite";
import {
  deleteCloudProject,
  listCloudProjects,
  loadCloudProject,
  saveCloudProject,
  type CloudProjectMeta,
} from "@/lib/authClient";
import { useTimeline } from "@/store/useTimelineStore";

export function CloudProjectsModal() {
  const {
    project,
    cloudProjectId,
    setCloudProjectId,
    activeModal,
    closeModal,
    loadProject,
    lang,
    showNotice,
  } = useTimeline();

  const [items, setItems] = useState<CloudProjectMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listCloudProjects();
      setItems(list);
    } catch {
      showNotice(
        lang === "en"
          ? "Failed to fetch cloud projects."
          : "Gagal memuat daftar proyek cloud."
      );
    } finally {
      setLoading(false);
    }
  }, [lang, showNotice]);

  useEffect(() => {
    if (activeModal !== "cloud") return;
    const id = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(id);
  }, [activeModal, refresh]);

  if (activeModal !== "cloud") return null;

  const handleSaveCurrentToCloud = async () => {
    setBusyId("save-new");
    try {
      const saved = await saveCloudProject(cloudProjectId, project);
      setCloudProjectId(saved.id);
      showNotice(
        lang === "en"
          ? "Saved to cloud!"
          : "Proyek berhasil disimpan ke cloud!"
      );
      await refresh();
    } catch {
      showNotice(
        lang === "en"
          ? "Failed to save project."
          : "Gagal menyimpan proyek ke cloud."
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleOpen = async (id: string) => {
    setBusyId(id);
    try {
      const res = await loadCloudProject(id);
      loadProject(res.data);
      setCloudProjectId(res.id);
      showNotice(
        lang === "en"
          ? `Loaded "${res.name}"`
          : `Proyek "${res.name}" dibuka`
      );
      closeModal();
    } catch {
      showNotice(
        lang === "en" ? "Failed to open project." : "Gagal membuka proyek."
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    try {
      await deleteCloudProject(id);
      if (cloudProjectId === id) setCloudProjectId(null);
      setItems((prev) => prev.filter((x) => x.id !== id));
      showNotice(lang === "en" ? "Project deleted." : "Proyek dihapus.");
    } catch {
      showNotice(
        lang === "en" ? "Failed to delete project." : "Gagal menghapus proyek."
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2000] bg-[#09140E]/45 backdrop-blur-[3px] flex items-center justify-center p-5"
      onClick={closeModal}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cloud-dlg-title"
    >
      <div
        className="bg-white rounded-[18px] shadow-2xl w-full max-w-[540px] max-h-[calc(100vh-40px)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line)]">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[var(--brand-50)] text-[var(--brand-700)] grid place-items-center">
              <Icon name="cloud-check" />
            </span>
            <div>
              <h2 id="cloud-dlg-title" className="font-extrabold text-[15px]">
                {lang === "en" ? "Cloud Projects" : "Proyek Cloud Saya"}
              </h2>
              <p className="text-[11.5px] text-[var(--muted)]">
                {lang === "en"
                  ? "Stored securely in your Cloudflare D1 account"
                  : "Tersimpan aman di akun Cloudflare D1 Anda"}
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
          <button
            type="button"
            disabled={busyId === "save-new"}
            onClick={handleSaveCurrentToCloud}
            className="btn primary w-full"
          >
            <Icon name="save" />
            <span>
              {cloudProjectId
                ? lang === "en"
                  ? "Sync Current Project to Cloud"
                  : "Sinkronkan Proyek Aktif ke Cloud"
                : lang === "en"
                  ? "Save Current Draft to Cloud"
                  : "Simpan Draft Saat Ini ke Cloud"}
            </span>
          </button>

          {loading ? (
            <div className="py-8 text-center text-[12.5px] text-[var(--muted)]">
              {lang === "en" ? "Loading projects..." : "Memuat daftar proyek..."}
            </div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-[12.5px] text-[var(--muted)] border border-dashed border-[var(--line)] rounded-xl">
              {lang === "en"
                ? "No cloud projects yet. Click the button above to save your current timeline."
                : "Belum ada proyek di cloud. Klik tombol di atas untuk menyimpan timeline saat ini."}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {items.map((item) => {
                const isCurrent = cloudProjectId === item.id;
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${
                      isCurrent
                        ? "border-[var(--brand)] bg-[var(--brand-50)]"
                        : "border-[var(--line)] bg-white"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-[13px] text-[var(--ink)] truncate flex items-center gap-1.5">
                        <span className="truncate">{item.name}</span>
                        {isCurrent && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--brand)] text-white">
                            {lang === "en" ? "Active" : "Aktif"}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[var(--muted)]">
                        {new Date(item.updatedAt).toLocaleString(
                          lang === "en" ? "en-US" : "id-ID"
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        className="btn sm soft"
                        onClick={() => handleOpen(item.id)}
                      >
                        {lang === "en" ? "Open" : "Buka"}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        className="ibtn danger"
                        aria-label="Delete project"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Icon name="trash" size="sm" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
