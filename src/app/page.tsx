"use client";

import React, { useEffect } from "react";
import { AppBar } from "@/components/AppBar";
import { Icon, IconSprite } from "@/components/IconSprite";
import { AuthModal } from "@/components/Modals/AuthModal";
import { BulkPasteModal } from "@/components/Modals/BulkPasteModal";
import { CloudProjectsModal } from "@/components/Modals/CloudProjectsModal";
import { ExportModal } from "@/components/Modals/ExportModal";
import { HelpModal } from "@/components/Modals/HelpModal";
import { PlanWizardModal } from "@/components/Modals/PlanWizardModal";
import { PageTabs } from "@/components/PageTabs";
import { PresentationMode } from "@/components/PresentationMode";
import { Sidebar } from "@/components/Sidebar/Sidebar";
import { Stage } from "@/components/Stage";
import { authClient } from "@/lib/authClient";
import { TimelineProvider, useTimeline } from "@/store/useTimelineStore";

function WorkspaceShell() {
  const { data: session, isPending } = authClient.useSession();
  const {
    notice,
    lang,
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
    if (!session?.user) return;
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
  }, [session?.user, activeModal, addGroup, addTask, closeModal, openModal, redo, toggleSidebar, undo]);

  if (isPending) {
    return (
      <>
        <IconSprite />
        <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 bg-[linear-gradient(135deg,#07331A,#0B4622_55%,#15733A)] text-white">
          <Icon name="brand" className="w-12 h-12 animate-pulse" />
          <span className="text-[13px] font-semibold text-white/80">
            {lang === "en" ? "Checking session..." : "Memeriksa sesi..."}
          </span>
        </div>
      </>
    );
  }

  if (!session?.user) {
    return (
      <>
        <IconSprite />
        <AuthModal blocking />
      </>
    );
  }

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
      <AuthModal />
      <CloudProjectsModal />
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
