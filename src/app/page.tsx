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
import { ShareModal } from "@/components/Modals/ShareModal";
import { PageTabs } from "@/components/PageTabs";
import { PresentationMode } from "@/components/PresentationMode";
import { PublicLanding } from "@/components/PublicLanding";
import { Sidebar } from "@/components/Sidebar/Sidebar";
import { Stage } from "@/components/Stage";
import {
  acceptWorkspaceInvite,
  authClient,
  listCloudProjects,
  loadCloudProject,
} from "@/lib/authClient";
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
    showNotice,
    cloudProjectId,
    openCloudProject,
  } = useTimeline();

  useEffect(() => {
    if (!session?.user || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get("invite");
    const projectParam = params.get("project");
    if (!inviteToken && !projectParam) return;

    const updateUrlProject = (pid: string | null) => {
      const next = new URL(window.location.href);
      next.searchParams.delete("invite");
      if (pid) {
        next.searchParams.set("project", pid);
      } else {
        next.searchParams.delete("project");
      }
      window.history.replaceState({}, "", next.pathname + next.search + next.hash);
    };

    const timer = setTimeout(() => {
      void (async () => {
        try {
          if (inviteToken) {
            const res = await acceptWorkspaceInvite(inviteToken);
            let targetPid = projectParam;
            if (!targetPid) {
              const allProjects = await listCloudProjects().catch(() => []);
              const wsProj = allProjects.find((p) => p.workspaceId === res.workspaceId);
              targetPid = wsProj?.id || null;
            }
            if (targetPid) {
              const loaded = await loadCloudProject(targetPid);
              openCloudProject({
                id: loaded.id,
                workspaceId: loaded.workspaceId ?? null,
                role: loaded.role ?? res.role,
                version: loaded.version,
                data: loaded.data,
              });
              updateUrlProject(loaded.id);
            } else {
              updateUrlProject(null);
              openModal("team");
            }
            showNotice(
              lang === "en"
                ? `Joined "${res.workspaceName}" as ${res.role}!`
                : `Bergabung ke "${res.workspaceName}" sebagai ${res.role}!`
            );
          } else if (projectParam && projectParam !== cloudProjectId) {
            const loaded = await loadCloudProject(projectParam);
            openCloudProject({
              id: loaded.id,
              workspaceId: loaded.workspaceId ?? null,
              role: loaded.role ?? "owner",
              version: loaded.version,
              data: loaded.data,
            });
            updateUrlProject(loaded.id);
            showNotice(
              lang === "en"
                ? `Opened "${loaded.name}"`
                : `Proyek "${loaded.name}" dibuka`
            );
          }
        } catch (err) {
          updateUrlProject(cloudProjectId);
          const msg = err instanceof Error ? err.message : "Invalid link";
          showNotice(msg);
        }
      })();
    }, 0);

    return () => clearTimeout(timer);
  }, [session?.user, lang, openModal, showNotice, cloudProjectId, openCloudProject]);

  // Keep ?project=<id> synced in URL for easy Google-Sheets-style link sharing
  useEffect(() => {
    if (!session?.user || typeof window === "undefined") return;
    const next = new URL(window.location.href);
    if (next.searchParams.has("invite")) return;
    const current = next.searchParams.get("project");
    if (cloudProjectId && current !== cloudProjectId) {
      next.searchParams.set("project", cloudProjectId);
      window.history.replaceState({}, "", next.pathname + next.search + next.hash);
    } else if (!cloudProjectId && current) {
      next.searchParams.delete("project");
      window.history.replaceState({}, "", next.pathname + next.search + next.hash);
    }
  }, [session?.user, cloudProjectId]);

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
          <img
            src="/tlbicon.png"
            alt="Timeline Builder Online"
            className="w-12 h-12 rounded-xl object-contain animate-pulse"
          />
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
        <PublicLanding />
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
      <ShareModal />
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
