"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/IconSprite";
import {
  addTaskComment,
  authClient,
  deleteTaskComment,
  getProjectSharing,
  type ProjectSharingInfo,
  type TaskCommentItem,
} from "@/lib/authClient";
import { useTimeline } from "@/store/useTimelineStore";

export function TaskCommentsDrawer() {
  const {
    activeCommentRowId,
    setActiveCommentRowId,
    cloudProjectId,
    cloudProjectRole,
    activePage,
    comments,
    setComments,
    broadcastComment,
    lang,
    showNotice,
  } = useTimeline();

  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id || "";

  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [sharingInfo, setSharingInfo] = useState<ProjectSharingInfo | null>(null);

  useEffect(() => {
    if (!activeCommentRowId || !cloudProjectId) return;
    let cancelled = false;
    const id = setTimeout(() => {
      void getProjectSharing(cloudProjectId)
        .then((res) => {
          if (!cancelled) setSharingInfo(res);
        })
        .catch(() => {
          // Ignore
        });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [activeCommentRowId, cloudProjectId]);

  const row = useMemo(
    () => activePage.rows.find((r) => r.id === activeCommentRowId) || null,
    [activeCommentRowId, activePage.rows]
  );

  const rowComments = useMemo(
    () => comments.filter((c) => c.rowId === activeCommentRowId),
    [activeCommentRowId, comments]
  );

  const mentionCandidates = useMemo(() => {
    if (!sharingInfo) return [];
    const list = [
      {
        userId: sharingInfo.owner.userId,
        name: sharingInfo.owner.name,
        email: sharingInfo.owner.email,
      },
      ...sharingInfo.members.map((m) => ({
        userId: m.userId,
        name: m.name,
        email: m.email,
      })),
    ];
    return list.filter((u) => u.userId !== currentUserId);
  }, [currentUserId, sharingInfo]);

  const mentionQuery = useMemo(() => {
    const m = body.match(/@([a-zA-Z0-9_.\s]{0,20})$/);
    return m ? m[1].toLowerCase() : null;
  }, [body]);

  const filteredCandidates = useMemo(() => {
    if (mentionQuery === null) return [];
    return mentionCandidates
      .filter(
        (u) =>
          u.name.toLowerCase().includes(mentionQuery) ||
          u.email.toLowerCase().includes(mentionQuery)
      )
      .slice(0, 5);
  }, [mentionCandidates, mentionQuery]);

  if (!activeCommentRowId) return null;

  const insertMention = (name: string) => {
    const tag = `@${name.split(" ")[0]} `;
    setBody((prev) => prev.replace(/@([a-zA-Z0-9_.\s]{0,20})$/, tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloudProjectId || !body.trim()) return;
    setBusy(true);
    try {
      const mentionedIds = mentionCandidates
        .filter((u) => {
          const first = u.name.split(" ")[0].toLowerCase();
          return (
            body.toLowerCase().includes(`@${first}`) ||
            body.toLowerCase().includes(`@${u.name.toLowerCase()}`)
          );
        })
        .map((u) => u.userId);

      const created = await addTaskComment(
        cloudProjectId,
        activeCommentRowId,
        body.trim(),
        mentionedIds
      );
      setComments((prev) => [...prev, created]);
      broadcastComment(created);
      setBody("");
    } catch {
      showNotice(
        lang === "en" ? "Failed to post comment." : "Gagal mengirim komentar."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (comment: TaskCommentItem) => {
    if (!cloudProjectId) return;
    try {
      await deleteTaskComment(cloudProjectId, comment.id);
      setComments((prev) => prev.filter((c) => c.id !== comment.id));
    } catch {
      showNotice(
        lang === "en" ? "Failed to delete comment." : "Gagal menghapus komentar."
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1900] bg-[#1A0D06]/25 backdrop-blur-[1px] flex justify-end"
      onClick={() => setActiveCommentRowId(null)}
      role="dialog"
      aria-modal="true"
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[380px] h-full bg-[#F8F6F4] border-l border-[var(--line)] shadow-2xl flex flex-col"
      >
        <div className="px-5 py-4 bg-white border-b border-[var(--line)] flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-extrabold text-[15px] text-[var(--ink)]">
              {lang === "en" ? "Task Comments" : "Komentar Tugas"}
            </h2>
            <p className="text-[12px] font-semibold text-[var(--brand-700)] truncate">
              {row?.name || activeCommentRowId}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveCommentRowId(null)}
            className="ibtn sm"
            aria-label="Close"
          >
            <Icon name="x" size="sm" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
          {rowComments.length === 0 ? (
            <div className="py-10 px-4 text-center text-[12.5px] text-[var(--muted)] bg-white rounded-2xl border border-dashed border-[var(--line)]">
              {lang === "en"
                ? "No comments yet. Mention teammates with @ to notify them."
                : "Belum ada komentar. Gunakan @ untuk menyebut rekan tim."}
            </div>
          ) : (
            rowComments.map((c) => {
              const canDel =
                cloudProjectRole === "owner" || c.userId === currentUserId;
              return (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl border border-[var(--line)] p-3 shadow-sm flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-[var(--brand-100)] text-[var(--brand-800)] font-extrabold text-[10.5px] grid place-items-center shrink-0">
                        {(c.userName[0] || "U").toUpperCase()}
                      </span>
                      <span className="text-[12.5px] font-bold text-[var(--ink)] truncate">
                        {c.userName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10.5px] text-[var(--muted)]">
                        {new Date(c.createdAt).toLocaleTimeString(
                          lang === "en" ? "en-US" : "id-ID",
                          { hour: "2-digit", minute: "2-digit" }
                        )}
                      </span>
                      {canDel && (
                        <button
                          type="button"
                          onClick={() => void handleDelete(c)}
                          className="ibtn xs danger"
                          title={lang === "en" ? "Delete" : "Hapus"}
                        >
                          <Icon name="trash" size="xs" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-[12.5px] text-[var(--ink-2)] whitespace-pre-wrap break-words leading-relaxed">
                    {c.body}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Comment Composer with @mention dropdown */}
        <form
          onSubmit={handleSubmit}
          className="p-3.5 bg-white border-t border-[var(--line)] flex flex-col gap-2 relative"
        >
          {filteredCandidates.length > 0 && (
            <div className="absolute bottom-[calc(100%+4px)] left-3.5 right-3.5 bg-white rounded-xl border border-[var(--line)] shadow-xl p-1 z-20">
              {filteredCandidates.map((u) => (
                <button
                  key={u.userId}
                  type="button"
                  onClick={() => insertMention(u.name)}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-[12px] hover:bg-[var(--brand-50)] flex items-center justify-between gap-2"
                >
                  <span className="font-bold text-[var(--ink)]">{u.name}</span>
                  <span className="text-[11px] text-[var(--muted)] truncate">
                    {u.email}
                  </span>
                </button>
              ))}
            </div>
          )}

          <textarea
            rows={2}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              lang === "en"
                ? "Write a comment... Use @name to mention"
                : "Tulis komentar... Ketik @nama untuk mention"
            }
            className="inp w-full resize-none text-[12.5px]"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-[var(--muted)]">
              {mentionCandidates.length > 0
                ? lang === "en"
                  ? "Tip: type @ to mention"
                  : "Tips: ketik @ untuk mention"
                : ""}
            </span>
            <button
              type="submit"
              disabled={busy || !body.trim()}
              className="btn sm primary"
            >
              {busy
                ? lang === "en"
                  ? "Sending..."
                  : "Mengirim..."
                : lang === "en"
                  ? "Send"
                  : "Kirim"}
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
