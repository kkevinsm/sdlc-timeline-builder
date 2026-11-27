"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/IconSprite";
import { AuthModal } from "@/components/Modals/AuthModal";
import { PublicLanding } from "@/components/PublicLanding";
import { TimelineCard } from "@/components/TimelineCard";
import { SCALE_MODES } from "@/constants/theme";
import { buildTimelineModel } from "@/engine/layoutModel";
import { loadPublicProject } from "@/lib/authClient";
import { useTimeline } from "@/store/useTimelineStore";

interface PublicProjectViewProps {
  projectId: string;
}

export function PublicProjectView({ projectId }: PublicProjectViewProps) {
  const {
    project,
    activePage,
    lang,
    setLang,
    setMode,
    setZoom,
    setActivePage,
    loadProject,
    openModal,
    t,
  } = useTimeline();

  const [status, setStatus] = useState<"loading" | "ready" | "private" | "notfound">(
    "loading"
  );
  const [projectTitle, setProjectTitle] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadPublicProject(projectId)
      .then((res) => {
        if (cancelled) return;
        loadProject(res.data);
        setProjectTitle(res.name || res.data.name || "Timeline");
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "";
        if (msg === "PRIVATE_PROJECT") {
          setStatus("private");
          openModal("auth");
        } else {
          setStatus("notfound");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, loadProject, openModal]);

  const model = useMemo(
    () => buildTimelineModel(activePage, project.mode, lang),
    [activePage, project.mode, lang]
  );

  if (status === "loading") {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-3 bg-[linear-gradient(135deg,#431407,#9A3412_55%,#EA580C)] text-white">
        <img
          src="/tlbicon.png"
          alt="Timeline Builder Online"
          className="w-12 h-12 rounded-xl object-contain bg-white/95 p-1 shadow-md animate-pulse"
        />
        <span className="text-[13px] font-semibold text-white/85">
          {lang === "en" ? "Loading shared timeline..." : "Memuat timeline publik..."}
        </span>
      </div>
    );
  }

  if (status === "private" || status === "notfound") {
    return <PublicLanding />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F8F6] text-[#111C16]">
      {/* Read-only Public Header */}
      <header className="sticky top-0 z-30 bg-[#9A3412] text-white border-b border-white/10">
        <div className="px-4 h-14 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/tlbicon.png"
              alt="Timeline Builder Online"
              className="w-8 h-8 rounded-lg object-contain bg-white/95 p-0.5 shadow-sm shrink-0"
            />
            <span className="font-extrabold text-[15px] tracking-tight truncate max-w-[260px] sm:max-w-[400px]">
              {projectTitle || activePage.title}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white/15 border border-white/25 text-[10.5px] font-bold shrink-0">
              {lang === "en" ? "Read-only" : "Hanya Lihat"}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="inline-flex bg-white/10 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setLang("id")}
                className={`px-2 py-0.5 text-[11px] font-bold rounded-md ${
                  lang === "id" ? "bg-white text-[#9A3412]" : "text-white/80"
                }`}
              >
                ID
              </button>
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`px-2 py-0.5 text-[11px] font-bold rounded-md ${
                  lang === "en" ? "bg-white text-[#9A3412]" : "text-white/80"
                }`}
              >
                EN
              </button>
            </div>

            <button
              type="button"
              onClick={() => openModal("auth")}
              style={{ backgroundColor: "#FFFFFF", color: "#9A3412" }}
              className="px-3.5 py-1.5 rounded-full font-bold text-[12.5px] hover:opacity-95 transition-opacity shadow-sm"
            >
              {lang === "en" ? "Sign in" : "Masuk"}
            </button>
          </div>
        </div>
      </header>

      {/* View Controls Bar */}
      <div className="bg-white border-b border-[var(--line)] px-4 py-2 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {project.pages.length > 1 &&
            project.pages.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActivePage(p.id)}
                className={`px-3 py-1 rounded-lg text-[12px] font-bold transition-colors ${
                  p.id === activePage.id
                    ? "bg-[#9A3412] text-white"
                    : "bg-[#F4F6F5] text-[var(--ink-2)] hover:bg-[#E8ECE9]"
                }`}
              >
                {p.name}
              </button>
            ))}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-[#F4F6F5] p-0.5 rounded-lg">
            {SCALE_MODES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors ${
                  project.mode === m
                    ? "bg-white text-[#9A3412] shadow-sm"
                    : "text-[var(--ink-2)]"
                }`}
              >
                {m === "day"
                  ? lang === "en"
                    ? "Day"
                    : "Hari"
                  : m === "3day"
                    ? lang === "en"
                      ? "3 Days"
                      : "3 Hari"
                    : m === "week"
                      ? lang === "en"
                        ? "Week"
                        : "Minggu"
                      : m === "2week"
                        ? lang === "en"
                          ? "2 Weeks"
                          : "2 Minggu"
                        : lang === "en"
                          ? "Month"
                          : "Bulan"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              className="tbtn"
              aria-label={t("pg.zoomout.t")}
              onClick={() => setZoom(project.zoom - 10)}
            >
              <Icon name="zoom-out" />
            </button>
            <button
              type="button"
              className="zv"
              onClick={() => setZoom(100)}
            >
              {project.zoom}%
            </button>
            <button
              type="button"
              className="tbtn"
              aria-label={t("pg.zoomin.t")}
              onClick={() => setZoom(project.zoom + 10)}
            >
              <Icon name="zoom-in" />
            </button>
          </div>
        </div>
      </div>

      {/* Timeline Canvas */}
      <main className="flex-1 overflow-auto p-4 sm:p-6">
        <TimelineCard
          model={model}
          cardRef={cardRef}
          scale={project.zoom / 100}
          currentPeriodBadge={model.cp?.label || ""}
        />
      </main>

      <AuthModal />
    </div>
  );
}
