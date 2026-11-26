"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/IconSprite";
import {
  deleteCloudProject,
  listCloudProjects,
  listWorkspaces,
  loadCloudProject,
  saveCloudProject,
  type CloudProjectMeta,
  type WorkspaceSummary,
} from "@/lib/authClient";
import { useTimeline } from "@/store/useTimelineStore";

export function CloudProjectsModal() {
  const {
    project,
    cloudProjectId,
    setCloudProjectId,
    activeWorkspaceId,
    setActiveWorkspaceId,
    cloudProjectRole,
    setCloudProjectRole,
    setCloudProjectVersion,
    activeModal,
    openModal,
    closeModal,
    openCloudProject,
    lang,
    showNotice,
  } = useTimeline();

  const [items, setItems] = useState<CloudProjectMeta[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [filterWs, setFilterWs] = useState<string>("all");
  const [targetWsId, setTargetWsId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [list, wsList] = await Promise.all([
        listCloudProjects(),
        listWorkspaces().catch(() => [] as WorkspaceSummary[]),
      ]);
      setItems(list);
      setWorkspaces(wsList);
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
    if (cloudProjectId && cloudProjectRole === "viewer") {
      showNotice(
        lang === "en"
          ? "Viewers cannot save changes to this project."
          : "Role viewer tidak dapat menyimpan perubahan ke proyek ini."
      );
      return;
    }
    setBusyId("save-new");
    try {
      const wsId = cloudProjectId ? activeWorkspaceId : targetWsId || null;
      const saved = await saveCloudProject(cloudProjectId, project, {
        workspaceId: wsId,
      });
      setCloudProjectId(saved.id);
      setActiveWorkspaceId(saved.workspaceId ?? null);
      setCloudProjectVersion(saved.version);
      if (!cloudProjectId) {
        setCloudProjectRole("owner");
      }
      showNotice(
        lang === "en"
          ? "Saved to cloud!"
          : "Proyek berhasil disimpan ke cloud!"
      );
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : null;
      showNotice(
        msg ||
          (lang === "en"
            ? "Failed to save project."
            : "Gagal menyimpan proyek ke cloud.")
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleOpen = async (item: CloudProjectMeta) => {
    setBusyId(item.id);
    try {
      const res = await loadCloudProject(item.id);
      openCloudProject({
        id: res.id,
        workspaceId: res.workspaceId ?? null,
        role: item.role ?? res.role ?? "owner",
        version: res.version,
        data: res.data,
      });
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
      if (cloudProjectId === id) {
        setCloudProjectId(null);
        setActiveWorkspaceId(null);
        setCloudProjectRole("owner");
        setCloudProjectVersion(null);
      }
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

  const writableWorkspaces = workspaces.filter((w) => w.role !== "viewer");
  const filteredItems = items.filter((item) => {
    if (filterWs === "all") return true;
    if (filterWs === "personal") return !item.workspaceId;
    return item.workspaceId === filterWs;
  });

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
          {!cloudProjectId && writableWorkspaces.length > 0 && (
            <div className="flex items-center gap-2 text-[12px]">
              <label
                htmlFor="cloud-save-ws"
                className="font-semibold text-[var(--muted)] shrink-0"
              >
                {lang === "en" ? "Save to:" : "Simpan ke:"}
              </label>
              <select
                id="cloud-save-ws"
                value={targetWsId}
                onChange={(e) => setTargetWsId(e.target.value)}
                className="flex-1 px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-white text-[12.5px] font-medium"
              >
                <option value="">
                  {lang === "en" ? "Personal (Only me)" : "Personal (Hanya saya)"}
                </option>
                {writableWorkspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busyId === "save-new" || (!!cloudProjectId && cloudProjectRole === "viewer")}
              onClick={handleSaveCurrentToCloud}
              className="btn primary flex-1"
            >
              <Icon name="save" />
              <span>
                {cloudProjectId
                  ? cloudProjectRole === "viewer"
                    ? lang === "en"
                      ? "Read-only (Viewer)"
                      : "Hanya Baca (Viewer)"
                    : lang === "en"
                      ? "Sync Current Project to Cloud"
                      : "Sinkronkan Proyek Aktif ke Cloud"
                  : lang === "en"
                    ? "Save Current Draft to Cloud"
                    : "Simpan Draft Saat Ini ke Cloud"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => openModal("team")}
              className="btn soft shrink-0"
              title={lang === "en" ? "Manage Team Workspaces" : "Kelola Team Workspace"}
            >
              <Icon name="user" size="sm" />
              <span>Team</span>
            </button>
          </div>

          {workspaces.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setFilterWs("all")}
                className={`px-2.5 py-1 rounded-full text-[11.5px] font-semibold shrink-0 border ${
                  filterWs === "all"
                    ? "bg-[var(--brand)] text-white border-[var(--brand)]"
                    : "bg-white text-[var(--muted)] border-[var(--line)] hover:border-[var(--brand)]"
                }`}
              >
                {lang === "en" ? "All" : "Semua"} ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterWs("personal")}
                className={`px-2.5 py-1 rounded-full text-[11.5px] font-semibold shrink-0 border ${
                  filterWs === "personal"
                    ? "bg-[var(--brand)] text-white border-[var(--brand)]"
                    : "bg-white text-[var(--muted)] border-[var(--line)] hover:border-[var(--brand)]"
                }`}
              >
                Personal
              </button>
              {workspaces.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setFilterWs(w.id)}
                  className={`px-2.5 py-1 rounded-full text-[11.5px] font-semibold shrink-0 border ${
                    filterWs === w.id
                      ? "bg-[var(--brand)] text-white border-[var(--brand)]"
                      : "bg-white text-[var(--muted)] border-[var(--line)] hover:border-[var(--brand)]"
                  }`}
                >
                  {w.name}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="py-8 text-center text-[12.5px] text-[var(--muted)]">
              {lang === "en" ? "Loading projects..." : "Memuat daftar proyek..."}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-8 text-center text-[12.5px] text-[var(--muted)] border border-dashed border-[var(--line)] rounded-xl">
              {lang === "en"
                ? "No cloud projects yet. Click the button above to save your current timeline."
                : "Belum ada proyek di cloud. Klik tombol di atas untuk menyimpan timeline saat ini."}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredItems.map((item) => {
                const isCurrent = cloudProjectId === item.id;
                const role = item.role ?? "owner";
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
                      <div className="font-bold text-[13px] text-[var(--ink)] truncate flex items-center gap-1.5 flex-wrap">
                        <span className="truncate">{item.name}</span>
                        {isCurrent && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--brand)] text-white">
                            {lang === "en" ? "Active" : "Aktif"}
                          </span>
                        )}
                        {item.workspaceName ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#EEF4FF] text-[#1D4ED8] font-semibold">
                            {item.workspaceName} · {role}
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F3F4F6] text-[#4B5563] font-semibold">
                            Personal
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[var(--muted)]">
                        {new Date(item.updatedAt).toLocaleString(
                          lang === "en" ? "en-US" : "id-ID"
                        )}
                        {item.lastEditedBy ? ` · ${item.lastEditedBy}` : ""}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        className="btn sm soft"
                        onClick={() => handleOpen(item)}
                      >
                        {lang === "en" ? "Open" : "Buka"}
                      </button>
                      {role === "owner" && (
                        <button
                          type="button"
                          disabled={busyId === item.id}
                          className="ibtn danger"
                          aria-label="Delete project"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Icon name="trash" size="sm" />
                        </button>
                      )}
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
