"use client";

import React, { useEffect } from "react";
import { AppBar } from "@/components/AppBar";
import { IconSprite } from "@/components/IconSprite";
import { BulkPasteModal } from "@/components/Modals/BulkPasteModal";
import { ExportModal } from "@/components/Modals/ExportModal";
import { HelpModal } from "@/components/Modals/HelpModal";
import { PlanWizardModal } from "@/components/Modals/PlanWizardModal";
import { PageTabs } from "@/components/PageTabs";
import { PresentationMode } from "@/components/PresentationMode";
import { Sidebar } from "@/components/Sidebar/Sidebar";
import { Stage } from "@/components/Stage";
import { TimelineProvider, useTimeline } from "@/store/useTimelineStore";

function WorkspaceShell() {
  const {
    notice,
    activeModal,
    openModal,
    closeModal,
    addGroup,
    addTask,
    toggleSidebar,
    undo,
    redo,
  } = useTimeline();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      if (e.key === "Escape" && activeModal) {
        closeModal();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (!isInput) {
          e.preventDefault();
          undo();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        if (!isInput) {
          e.preventDefault();
          redo();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "e") {
        e.preventDefault();
        openModal("export");
        return;
      }

      if (isInput || activeModal || e.ctrlKey || e.metaKey || e.altKey) return;

      const k = e.key.toLowerCase();
      if (k === "g") addGroup();
      else if (k === "t") addTask();
      else if (k === "l") openModal("paste");
      else if (k === "b") toggleSidebar();
      else if (k === "p") openModal("present");
      else if (e.key === "?") openModal("help");
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeModal, addGroup, addTask, closeModal, openModal, redo, toggleSidebar, undo]);

  return (
    <>
      <IconSprite />
      <AppBar />
      <PageTabs />
      <main id="main">
        <Sidebar />
        <Stage />
      </main>
      <BulkPasteModal />
      <PlanWizardModal />
      <ExportModal />
      <PresentationMode />
      <HelpModal />
      {notice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-[3000] px-4 py-2.5 rounded-xl bg-[var(--brand-900)] text-white text-[12.5px] font-semibold shadow-lg border border-white/15"
        >
          {notice}
        </div>
      )}
    </>
  );
}

export default function Home() {
  return (
    <TimelineProvider>
      <WorkspaceShell />
    </TimelineProvider>
  );
}
