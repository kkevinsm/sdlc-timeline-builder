"use client";

import React, { useCallback, useRef } from "react";
import { Icon } from "@/components/IconSprite";
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
    t,
    showNotice,
  } = useTimeline();

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
      aria-label="Timeline Builder Pro actions"
      onKeyDown={handleToolbarKeyDown}
    >
      <div className="brand" title="Timeline Builder Pro — WakeLabs">
        <Icon name="brand" className="brand-mark" />
        <div className="brand-text">
          <b>
            Timeline Builder <span className="pro">Pro</span>
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

      <div
        className="save-state"
        id="save-state"
        title={t("ui.saved.title")}
        role="status"
        aria-live="polite"
      >
        <Icon name="cloud-off" size="sm" />
        <span>{saveState === "saving" ? t("ui.saving") : t("ui.saved")}</span>
      </div>

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
    </header>
  );
}
