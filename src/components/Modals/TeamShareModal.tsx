"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/IconSprite";
import {
  createWorkspace,
  createWorkspaceInvite,
  getWorkspaceDetail,
  listWorkspaces,
  removeWorkspaceMember,
  revokeWorkspaceInvite,
  updateMemberRole,
  type WorkspaceDetail,
  type WorkspaceSummary,
} from "@/lib/authClient";
import { useTimeline } from "@/store/useTimelineStore";

export function TeamShareModal() {
  const { activeModal, closeModal, lang, showNotice } = useTimeline();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [selectedWsId, setSelectedWsId] = useState<string | null>(null);
  const [detail, setDetail] = useState<WorkspaceDetail | null>(null);
  const [newWsName, setNewWsName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [busy, setBusy] = useState(false);

  const loadList = useCallback(async () => {
    try {
      const list = await listWorkspaces();
      setWorkspaces(list);
      setSelectedWsId((prev) => prev || list[0]?.id || null);
    } catch {
      showNotice(
        lang === "en"
          ? "Failed to load team workspaces."
          : "Gagal memuat daftar Team Workspace."
      );
    }
  }, [lang, showNotice]);

  const loadDetail = useCallback(async (wsId: string) => {
    try {
      const d = await getWorkspaceDetail(wsId);
      setDetail(d);
    } catch {
      setDetail(null);
    }
  }, []);

  useEffect(() => {
    if (activeModal !== "team") return;
    const id = setTimeout(() => {
      void loadList();
    }, 0);
    return () => clearTimeout(id);
  }, [activeModal, loadList]);

  useEffect(() => {
    if (activeModal !== "team" || !selectedWsId) return;
    const id = setTimeout(() => {
      void loadDetail(selectedWsId);
    }, 0);
    return () => clearTimeout(id);
  }, [activeModal, selectedWsId, loadDetail]);

  if (activeModal !== "team") return null;

  const handleCreateWs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    setBusy(true);
    try {
      const created = await createWorkspace(newWsName.trim());
      setNewWsName("");
      await loadList();
      setSelectedWsId(created.id);
      showNotice(
        lang === "en" ? "Team Workspace created!" : "Team Workspace berhasil dibuat!"
      );
    } catch {
      showNotice(
        lang === "en" ? "Failed to create workspace." : "Gagal membuat workspace."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWsId) return;
    setBusy(true);
    try {
      const inv = await createWorkspaceInvite(
        selectedWsId,
        inviteRole,
        inviteEmail
      );
      const link = `${window.location.origin}/?invite=${inv.token}`;
      try {
        await navigator.clipboard.writeText(link);
        showNotice(
          lang === "en"
            ? "Invite link created & copied!"
            : "Link undangan dibuat & disalin!"
        );
      } catch {
        showNotice(
          lang === "en" ? "Invite link created!" : "Link undangan berhasil dibuat!"
        );
      }
      setInviteEmail("");
      await loadDetail(selectedWsId);
    } catch {
      showNotice(
        lang === "en" ? "Failed to create invite." : "Gagal membuat undangan."
      );
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async (token: string) => {
    const link = `${window.location.origin}/?invite=${token}`;
    try {
      await navigator.clipboard.writeText(link);
      showNotice(
        lang === "en" ? "Invite link copied!" : "Link undangan disalin!"
      );
    } catch {
      showNotice(link);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2000] bg-[#09140E]/45 backdrop-blur-[3px] flex items-center justify-center p-5"
      onClick={closeModal}
      role="dialog"
      aria-modal="true"
      aria-labelledby="team-dlg-title"
    >
      <div
        className="bg-white rounded-[18px] shadow-2xl w-full max-w-[660px] max-h-[calc(100vh-40px)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line)]">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[var(--brand-50)] text-[var(--brand-700)] grid place-items-center">
              <Icon name="user" />
            </span>
            <div>
              <h2 id="team-dlg-title" className="font-extrabold text-[15px]">
                {lang === "en"
                  ? "Team Workspaces & Sharing"
                  : "Team Workspace & Kolaborasi"}
              </h2>
              <p className="text-[11.5px] text-[var(--muted)]">
                {lang === "en"
                  ? "Invite teammates to collaborate on shared timelines"
                  : "Undang rekan tim untuk mengerjakan timeline bersama"}
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

        {/* Body */}
        <div className="p-5 flex flex-col gap-4 overflow-y-auto">
          {/* Create Workspace */}
          <form onSubmit={handleCreateWs} className="flex gap-2">
            <input
              type="text"
              className="inp flex-1"
              value={newWsName}
              onChange={(e) => setNewWsName(e.target.value)}
              placeholder={
                lang === "en"
                  ? "New team name (e.g. Product PMO)"
                  : "Nama tim baru (mis. Tim PMO / Produk)"
              }
            />
            <button
              type="submit"
              disabled={busy || !newWsName.trim()}
              className="btn primary shrink-0"
            >
              <Icon name="plus" />
              <span>{lang === "en" ? "Create Team" : "Buat Tim"}</span>
            </button>
          </form>

          {/* Workspace Selector */}
          {workspaces.length === 0 ? (
            <div className="py-8 text-center text-[12.5px] text-[var(--muted)] border border-dashed border-[var(--line)] rounded-xl">
              {lang === "en"
                ? "You don't have any Team Workspaces yet. Create one above!"
                : "Belum ada Team Workspace. Buat tim baru di atas untuk mulai kolaborasi!"}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-3">
              {/* Left list */}
              <div className="flex flex-col gap-1.5 border border-[var(--line)] rounded-xl p-2 bg-[#FAFBF9]">
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    type="button"
                    onClick={() => setSelectedWsId(ws.id)}
                    className={`text-left px-3 py-2 rounded-lg text-[12.5px] transition-colors flex flex-col gap-0.5 ${
                      selectedWsId === ws.id
                        ? "bg-[var(--brand)] text-white"
                        : "hover:bg-[var(--line-2)] text-[var(--ink)]"
                    }`}
                  >
                    <span className="font-bold truncate">{ws.name}</span>
                    <span
                      className={`text-[10.5px] ${
                        selectedWsId === ws.id
                          ? "text-white/80"
                          : "text-[var(--muted)]"
                      }`}
                    >
                      {ws.role.toUpperCase()} · {ws.memberCount}{" "}
                      {lang === "en" ? "member(s)" : "anggota"}
                    </span>
                  </button>
                ))}
              </div>

              {/* Right details */}
              {detail && (
                <div className="border border-[var(--line)] rounded-xl p-3.5 flex flex-col gap-3.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-[14px]">
                      {detail.workspace.name}
                    </h3>
                    <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-[var(--brand-50)] text-[var(--brand-700)] uppercase">
                      {detail.myRole}
                    </span>
                  </div>

                  {/* Invite form (Owner only) */}
                  {detail.myRole === "owner" && (
                    <form
                      onSubmit={handleCreateInvite}
                      className="p-2.5 rounded-xl bg-[#FAFBF9] border border-[var(--line-2)] flex flex-col gap-2"
                    >
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
                        {lang === "en" ? "Invite Teammate" : "Undang Anggota"}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <input
                          type="email"
                          className="inp sm flex-1 min-w-[160px]"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder={
                            lang === "en"
                              ? "Email (optional — leave empty for open link)"
                              : "Email (opsional — kosongkan untuk link bebas)"
                          }
                        />
                        <select
                          className="inp sm w-28"
                          value={inviteRole}
                          onChange={(e) =>
                            setInviteRole(e.target.value as "editor" | "viewer")
                          }
                        >
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <button
                          type="submit"
                          disabled={busy}
                          className="btn sm primary"
                        >
                          {lang === "en" ? "Create Link" : "Buat Link"}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Members */}
                  <div className="flex flex-col gap-1.5">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
                      {lang === "en" ? "Members" : "Anggota"} (
                      {detail.members.length})
                    </div>
                    {detail.members.map((m) => (
                      <div
                        key={m.userId}
                        className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-[var(--line-2)] text-[12px]"
                      >
                        <div className="min-w-0">
                          <div className="font-bold truncate">{m.name}</div>
                          <div className="text-[10.5px] text-[var(--muted)] truncate">
                            {m.email}
                          </div>
                        </div>
                        {detail.myRole === "owner" && m.role !== "owner" ? (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <select
                              className="inp sm w-24"
                              value={m.role}
                              onChange={async (e) => {
                                await updateMemberRole(
                                  detail.workspace.id,
                                  m.userId,
                                  e.target.value as "editor" | "viewer"
                                );
                                await loadDetail(detail.workspace.id);
                              }}
                            >
                              <option value="editor">Editor</option>
                              <option value="viewer">Viewer</option>
                            </select>
                            <button
                              type="button"
                              className="ibtn sm danger"
                              onClick={async () => {
                                await removeWorkspaceMember(
                                  detail.workspace.id,
                                  m.userId
                                );
                                await loadDetail(detail.workspace.id);
                              }}
                            >
                              <Icon name="x" size="xs" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10.5px] font-bold uppercase text-[var(--muted)]">
                            {m.role}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Active Invites */}
                  {detail.invites.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
                        {lang === "en" ? "Active Invite Links" : "Link Undangan Aktif"}
                      </div>
                      {detail.invites.map((inv) => (
                        <div
                          key={inv.id}
                          className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[var(--brand-50)] text-[11.5px]"
                        >
                          <div className="min-w-0">
                            <span className="font-bold uppercase text-[var(--brand-800)]">
                              {inv.role}
                            </span>{" "}
                            <span className="text-[var(--ink-2)]">
                              · {inv.email || (lang === "en" ? "Anyone with link" : "Siapa saja dengan link")}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              className="btn xs soft"
                              onClick={() => copyLink(inv.token)}
                            >
                              <Icon name="copy" size="xs" />
                              <span>{lang === "en" ? "Copy" : "Salin"}</span>
                            </button>
                            <button
                              type="button"
                              className="ibtn sm danger"
                              onClick={async () => {
                                await revokeWorkspaceInvite(
                                  detail.workspace.id,
                                  inv.id
                                );
                                await loadDetail(detail.workspace.id);
                              }}
                            >
                              <Icon name="trash" size="xs" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
