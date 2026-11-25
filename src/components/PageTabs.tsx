"use client";

import React, { useState } from "react";
import { Icon } from "@/components/IconSprite";
import { useTimeline } from "@/store/useTimelineStore";

export function PageTabs() {
  const {
    project,
    setActivePage,
    addPage,
    closePage,
    renamePage,
    t,
  } = useTimeline();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftName, setDraftName] = useState("");
  const isSolo = project.pages.length <= 1;

  return (
    <nav id="pagebar" aria-label="Slide pages">
      <div id="pagetabs">
        {project.pages.map((page) => {
          const isActive = page.id === project.activePageId;
          const isEditing = editingId === page.id;

          return (
            <div
              key={page.id}
              className={`ptab${isActive ? " on" : ""}${isSolo ? " solo" : ""}`}
              onClick={() => {
                if (!isEditing) setActivePage(page.id);
              }}
              onDoubleClick={() => {
                setEditingId(page.id);
                setDraftName(page.name);
              }}
              title={page.name}
            >
              <Icon name="slide" />
              {isEditing ? (
                <input
                  type="text"
                  value={draftName}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setDraftName(e.target.value)}
                  onBlur={() => {
                    renamePage(page.id, draftName);
                    setEditingId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      renamePage(page.id, draftName);
                      setEditingId(null);
                    } else if (e.key === "Escape") {
                      setEditingId(null);
                    }
                  }}
                  className="bg-white/90 text-[var(--ink)] px-1 rounded text-[12px] w-28 outline-none"
                />
              ) : (
                <span className="pname">{page.name}</span>
              )}
              {!isSolo && (
                <button
                  type="button"
                  className="pclose"
                  aria-label={`Close ${page.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    closePage(page.id);
                  }}
                >
                  <Icon name="x" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="ptab-add"
        title={t("pg.addpage.t")}
        aria-label={t("pg.addpage.t")}
        onClick={addPage}
      >
        <Icon name="plus" />
      </button>
    </nav>
  );
}
