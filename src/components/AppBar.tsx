"use client";

import React, { useCallback, useRef, useState } from "react";
import { Icon } from "@/components/IconSprite";
import { authClient } from "@/lib/authClient";
import { useTimeline } from "@/store/useTimelineStore";
import type { ProjectData } from "@/types/timeline";

export function AppBar() {
  const {
    project,
    lang,
    setLang,
    saveState,
    canUndo,
    canRedo,
    undo,
    redo,
    addGroup,
    addTask,
    openModal,
    resetProject,
    loadProject,
    cloudProjectId,
    setCloudProjectId,
    roomUsers,
    roomConnected,
    t,
    showNotice,
  } = useTimeline();

  const { data: session } = authClient.useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  const barRef = useRef<HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveJson = () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = (project.name || "timeline-project")
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-");
    a.href = url;
    a.download = `${safeName}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotice(lang === "en" ? "Project JSON saved!" : "File JSON proyek tersimpan!");
  };

  const handleOpenJson = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as ProjectData;
        if (parsed && Array.isArray(parsed.pages) && parsed.pages.length > 0) {
          loadProject(parsed);
          showNotice(lang === "en" ? "Project loaded!" : "Proyek berhasil dibuka!");
        } else {
          showNotice(lang === "en" ? "Invalid JSON file." : "Format file JSON tidak valid.");
        }
      } catch {
        showNotice(lang === "en" ? "Failed to parse JSON." : "Gagal membaca file JSON.");
      }
    };
    reader.readAsText(file);
  };

  const handleToolbarKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
      const bar = barRef.current;
      if (!bar) return;
      const buttons = Array.from(
        bar.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")
      );
      const currentIdx = buttons.indexOf(e.target as HTMLButtonElement);
      if (currentIdx === -1) return;
      e.preventDefault();
      let nextIdx = currentIdx;
      if (e.key === "ArrowRight") nextIdx = (currentIdx + 1) % buttons.length;
      else if (e.key === "ArrowLeft")
        nextIdx = (currentIdx - 1 + buttons.length) % buttons.length;
      else if (e.key === "Home") nextIdx = 0;
      else if (e.key === "End") nextIdx = buttons.length - 1;
      buttons[nextIdx]?.focus();
    },
    []
  );

  return (
    <header
      id="appbar"
      ref={barRef}
      role="toolbar"
      aria-label="Timeline Builder Online actions"
      onKeyDown={handleToolbarKeyDown}
    >
      <div className="brand" title="Timeline Builder Online">
        <img
          src="/tlbicon.png"
          alt="Timeline Builder Online"
          className="brand-mark rounded-xl object-contain bg-white/95 p-0.5 shadow-sm"
        />
        <div className="brand-text">
          <b>
            Timeline Builder <span className="pro">Online</span>
          </b>
          <small>by WakeLabs</small>
        </div>
      </div>

      <div className="ab-group" role="group" aria-label="Rows">
        <button
          type="button"
          className="abtn"
          title={t("pg.addgroup.t")}
          onClick={() => addGroup()}
        >
          <Icon name="group" />
          <span className="lb">{t("pg.group")}</span>
        </button>
        <button
          type="button"
          className="abtn"
          title={t("pg.addtask.t")}
          onClick={() => addTask()}
        >
          <Icon name="task" />
          <span className="lb">{t("pg.task")}</span>
        </button>
      </div>

      <span
        className="ab-sep"
        role="separator"
        aria-orientation="vertical"
      />

      <div className="ab-group" role="group" aria-label="Project">
        <button
          type="button"
          className="abtn"
          title={t("pg.sample.t")}
          onClick={() => openModal("plan")}
        >
          <Icon name="wand" />
          <span className="lb">{t("pg.sample")}</span>
        </button>
        <button
          type="button"
          className="abtn icon-always"
          title={t("pg.new.t")}
          aria-label={t("pg.new.t")}
          onClick={resetProject}
        >
          <Icon name="file-plus" />
          <span className="lb">{t("pg.new")}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            handleOpenJson(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          className="abtn icon-always"
          title={t("pg.open.t")}
          aria-label={t("pg.open.t")}
          onClick={() => fileInputRef.current?.click()}
        >
          <Icon name="folder-open" />
          <span className="lb">{t("pg.open")}</span>
        </button>
        <button
          type="button"
          className="abtn icon-always"
          title={t("pg.save.t")}
          aria-label={t("pg.save.t")}
          onClick={handleSaveJson}
        >
          <Icon name="save" />
          <span className="lb">{t("pg.save")}</span>
        </button>
      </div>

      <div className="ab-spacer" />

      <button
        type="button"
        className="save-state cursor-pointer hover:text-white"
        id="save-state"
        title={t("ui.saved.title")}
        role="status"
        aria-live="polite"
        onClick={() => openModal(session?.user ? "cloud" : "auth")}
      >
        <Icon name={session?.user ? "cloud-check" : "cloud-off"} size="sm" />
        <span>
          {saveState === "saving"
            ? t("ui.saving")
            : session?.user
              ? cloudProjectId
                ? lang === "en"
                  ? "Synced to cloud"
                  : "Tersimpan di cloud"
                : lang === "en"
                  ? "Save to cloud"
                  : "Simpan ke cloud"
              : t("ui.saved")}
        </span>
      </button>

      <div className="ab-group" role="group" aria-label="History and Help">
        <button
          type="button"
          className="abtn icon"
          id="btn-undo"
          title={t("pg.undo.t")}
          aria-label="Undo"
          disabled={!canUndo}
          onClick={undo}
        >
          <Icon name="undo" />
        </button>
        <button
          type="button"
          className="abtn icon"
          id="btn-redo"
          title={t("pg.redo.t")}
          aria-label="Redo"
          disabled={!canRedo}
          onClick={redo}
        >
          <Icon name="redo" />
        </button>
        <button
          type="button"
          className="abtn icon"
          title={t("pg.help.t")}
          aria-label={t("pg.help.t")}
          onClick={() => openModal("help")}
        >
          <Icon name="help" />
        </button>
      </div>

      <button
        type="button"
        className="abtn"
        id="btn-present"
        title={t("pg.present.t")}
        aria-label={t("pg.present")}
        onClick={() => openModal("present")}
      >
        <Icon name="play" />
        <span className="lb">{t("pg.present")}</span>
      </button>

      <button
        type="button"
        className="abtn cta"
        title={t("pg.export.t")}
        onClick={() => openModal("export")}
      >
        <Icon name="present" />
        <span>{t("pg.export")}</span>
      </button>

      <div className="ab-lang" role="group" aria-label="Language">
        <button
          type="button"
          className={lang === "id" ? "on" : ""}
          aria-pressed={lang === "id"}
          onClick={() => setLang("id")}
        >
          ID
        </button>
        <button
          type="button"
          className={lang === "en" ? "on" : ""}
          aria-pressed={lang === "en"}
          onClick={() => setLang("en")}
        >
          EN
        </button>
      </div>

      {session?.user ? (
        <div className="flex items-center gap-1.5 ml-1">
          {roomConnected && roomUsers.length > 0 && (
            <div
              className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/15 text-white text-[11.5px] font-semibold border border-white/20"
              title={roomUsers.map((u) => `${u.name} (${u.role})`).join(", ")}
            >
              <div className="flex items-center -space-x-1.5">
                {roomUsers.slice(0, 4).map((u) => (
                  <span
                    key={u.userId}
                    className="w-5 h-5 rounded-full text-[10px] font-extrabold text-white grid place-items-center ring-2 ring-[#9A3412]"
                    style={{ backgroundColor: u.color }}
                  >
                    {(u.name || "U")[0].toUpperCase()}
                  </span>
                ))}
                {roomUsers.length > 4 && (
                  <span className="w-5 h-5 rounded-full text-[9.5px] font-extrabold bg-white text-[var(--brand-700)] grid place-items-center ring-2 ring-[#9A3412]">
                    +{roomUsers.length - 4}
                  </span>
                )}
              </div>
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse" />
              <span>{roomUsers.length}</span>
            </div>
          )}
          <div className="inline-flex items-center rounded-full bg-[#C2E7FF] text-[#001D35] overflow-hidden shadow-sm">
            <button
              type="button"
              className="flex items-center gap-1.5 pl-3 pr-2.5 py-1.5 text-[12.5px] font-bold hover:bg-[#B3DCF8] transition-colors"
              title={lang === "en" ? "Share timeline" : "Bagikan timeline"}
              onClick={() => openModal("team")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>{lang === "en" ? "Share" : "Bagikan"}</span>
            </button>
            <span className="w-px h-4 bg-[#001D35]/20" />
            <button
              type="button"
              className="px-2 py-1.5 hover:bg-[#B3DCF8] transition-colors"
              title={lang === "en" ? "Copy project link" : "Salin link proyek"}
              onClick={async () => {
                if (!cloudProjectId) {
                  openModal("team");
                  return;
                }
                const link = `${window.location.origin}/?project=${encodeURIComponent(cloudProjectId)}`;
                try {
                  await navigator.clipboard.writeText(link);
                  showNotice(lang === "en" ? "Link copied!" : "Link disalin!");
                } catch {
                  showNotice(link);
                }
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </button>
          </div>
          <div className="relative">
          <button
            type="button"
            className="w-[34px] h-[34px] rounded-full bg-white text-[var(--brand-700)] font-extrabold text-[13px] grid place-items-center shadow ring-2 ring-white/30 hover:ring-white/60"
            aria-expanded={menuOpen}
            aria-label="Account menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {(session.user.name || session.user.email || "U")[0].toUpperCase()}
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-64 bg-white text-[var(--ink)] rounded-2xl shadow-2xl border border-[var(--line)] p-2 z-[90]">
              <div className="px-2.5 py-2 border-b border-[var(--line-2)]">
                <div className="font-extrabold text-[13px] truncate">
                  {session.user.name || "User"}
                </div>
                <div className="text-[11.5px] text-[var(--muted)] truncate">
                  {session.user.email}
                </div>
              </div>
              <button
                type="button"
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-semibold hover:bg-[var(--brand-50)] hover:text-[var(--brand-700)] mt-1"
                onClick={() => {
                  setMenuOpen(false);
                  openModal("cloud");
                }}
              >
                <Icon name="cloud-check" size="sm" />
                <span>{lang === "en" ? "Cloud Projects" : "Proyek Cloud"}</span>
              </button>
              <button
                type="button"
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-semibold hover:bg-[var(--brand-50)] hover:text-[var(--brand-700)]"
                onClick={() => {
                  setMenuOpen(false);
                  openModal("team");
                }}
              >
                <Icon name="user" size="sm" />
                <span>{lang === "en" ? "Team Workspace" : "Team Workspace"}</span>
              </button>
              <button
                type="button"
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] font-semibold text-[#C62828] hover:bg-[#FDECEC]"
                onClick={async () => {
                  setMenuOpen(false);
                  await authClient.signOut();
                  setCloudProjectId(null);
                  showNotice(lang === "en" ? "Signed out." : "Berhasil keluar.");
                }}
              >
                <Icon name="logout" size="sm" />
                <span>{lang === "en" ? "Sign out" : "Keluar"}</span>
              </button>
            </div>
          )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="abtn light ml-1"
          onClick={() => openModal("auth")}
        >
          <Icon name="user" size="sm" />
          <span>{lang === "en" ? "Sign in" : "Masuk"}</span>
        </button>
      )}
    </header>
  );
}
