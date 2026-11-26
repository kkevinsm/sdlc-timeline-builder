"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/IconSprite";
import {
  addProjectMember,
  authClient,
  getProjectSharing,
  removeProjectMember,
  saveCloudProject,
  updateProjectGeneralAccess,
  updateProjectMemberRole,
  type GeneralAccess,
  type ProjectSharingInfo,
} from "@/lib/authClient";
import { useTimeline } from "@/store/useTimelineStore";

const DEFAULT_NAMES = new Set([
  "",
  "timeline project",
  "proyek timeline",
  "untitled",
  "untitled timeline",
  "untitled spreadsheet",
]);

export function ShareModal() {
  const {
    activeModal,
    closeModal,
    lang,
    showNotice,
    project,
    activePage,
    updateActivePage,
    cloudProjectId,
    setCloudProjectId,
    setCloudProjectVersion,
  } = useTimeline();

  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id || "";

  const [step, setStep] = useState<"name" | "share">("share");
  const [nameInput, setNameInput] = useState("");
  const [info, setInfo] = useState<ProjectSharingInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [inviteRole, setInviteRole] = useState<"viewer" | "editor">("viewer");
  const [busy, setBusy] = useState(false);

  const currentDocName =
    activePage?.title?.trim() || project.name?.trim() || "Timeline Project";

  const ensureCloudAndLoad = useCallback(async () => {
    setLoading(true);
    try {
      let pid = cloudProjectId;
      if (!pid) {
        const saved = await saveCloudProject(null, project);
        pid = saved.id;
        setCloudProjectId(saved.id);
        setCloudProjectVersion(saved.version);
      }
      const data = await getProjectSharing(pid);
      setInfo(data);
    } catch {
      showNotice(
        lang === "en"
          ? "Failed to load sharing settings."
          : "Gagal memuat pengaturan berbagi."
      );
    } finally {
      setLoading(false);
    }
  }, [
    cloudProjectId,
    lang,
    project,
    setCloudProjectId,
    setCloudProjectVersion,
    showNotice,
  ]);

  useEffect(() => {
    if (activeModal !== "team") return;
    const isUntitled = DEFAULT_NAMES.has(currentDocName.toLowerCase());
    const id = setTimeout(() => {
      setNameInput(currentDocName);
      setStep(isUntitled ? "name" : "share");
      void ensureCloudAndLoad();
    }, 0);
    return () => clearTimeout(id);
  }, [activeModal, currentDocName, ensureCloudAndLoad]);

  if (activeModal !== "team") return null;

  const isOwner = info ? info.project.role === "owner" : true;
  const displayName = info?.project.name || currentDocName;
  const shareUrl =
    cloudProjectId && typeof window !== "undefined"
      ? `${window.location.origin}/?project=${encodeURIComponent(cloudProjectId)}`
      : "";

  const handleSaveNameBeforeShare = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (trimmed) {
      updateActivePage({ title: trimmed }, true);
      if (cloudProjectId && info) {
        setBusy(true);
        try {
          await updateProjectGeneralAccess(cloudProjectId, {
            generalAccess: info.project.generalAccess,
            generalRole: info.project.generalRole,
            name: trimmed,
          });
          setInfo((prev) =>
            prev
              ? { ...prev, project: { ...prev.project, name: trimmed } }
              : prev
          );
        } catch {
          // Non-fatal; autosave will sync title
        } finally {
          setBusy(false);
        }
      }
    }
    setStep("share");
  };

  const handleAddPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cloudProjectId || !emailInput.trim()) return;
    setBusy(true);
    try {
      const member = await addProjectMember(
        cloudProjectId,
        emailInput.trim(),
        inviteRole
      );
      setEmailInput("");
      setInfo((prev) => {
        if (!prev) return prev;
        const exists = prev.members.some((m) => m.userId === member.userId);
        return {
          ...prev,
          members: exists
            ? prev.members.map((m) => (m.userId === member.userId ? member : m))
            : [...prev.members, member],
        };
      });
      showNotice(
        lang === "en"
          ? `Added ${member.name}`
          : `${member.name} ditambahkan`
      );
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : lang === "en"
            ? "Failed to add user."
            : "Gagal menambahkan user.";
      showNotice(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleMemberRoleChange = async (
    memberUserId: string,
    role: "viewer" | "editor"
  ) => {
    if (!cloudProjectId) return;
    setBusy(true);
    try {
      await updateProjectMemberRole(cloudProjectId, memberUserId, role);
      setInfo((prev) =>
        prev
          ? {
              ...prev,
              members: prev.members.map((m) =>
                m.userId === memberUserId ? { ...m, role } : m
              ),
            }
          : prev
      );
    } catch {
      showNotice(
        lang === "en" ? "Failed to update role." : "Gagal mengubah role."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveMember = async (memberUserId: string) => {
    if (!cloudProjectId) return;
    setBusy(true);
    try {
      await removeProjectMember(cloudProjectId, memberUserId);
      setInfo((prev) =>
        prev
          ? {
              ...prev,
              members: prev.members.filter((m) => m.userId !== memberUserId),
            }
          : prev
      );
      showNotice(lang === "en" ? "Access removed." : "Akses dihapus.");
    } catch {
      showNotice(
        lang === "en" ? "Failed to remove access." : "Gagal menghapus akses."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleGeneralChange = async (
    generalAccess: GeneralAccess,
    generalRole: "viewer" | "editor"
  ) => {
    if (!cloudProjectId || !isOwner) return;
    setBusy(true);
    try {
      const updated = await updateProjectGeneralAccess(cloudProjectId, {
        generalAccess,
        generalRole,
      });
      setInfo((prev) =>
        prev
          ? {
              ...prev,
              project: {
                ...prev.project,
                generalAccess: updated.generalAccess,
                generalRole: updated.generalRole,
              },
            }
          : prev
      );
      showNotice(lang === "en" ? "Access updated" : "Akses diperbarui");
    } catch {
      showNotice(
        lang === "en"
          ? "Failed to update access."
          : "Gagal mengubah akses."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      showNotice(lang === "en" ? "Link copied!" : "Link timeline disalin!");
    } catch {
      showNotice(shareUrl);
    }
  };

  const isAnyone = info?.project.generalAccess === "anyone";

  return (
    <div
      className="fixed inset-0 z-[2000] bg-[#1A0D06]/50 backdrop-blur-[3px] flex items-center justify-center p-4"
      onClick={closeModal}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tlb-share-title"
    >
      {step === "name" ? (
        <form
          onSubmit={handleSaveNameBeforeShare}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-[18px] shadow-2xl border border-[var(--line)] w-full max-w-[420px] overflow-hidden"
        >
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[var(--line)] bg-[var(--brand-50)]">
            <img
              src="/tlbicon.png"
              alt="Timeline Builder Online"
              className="w-8 h-8 rounded-lg object-contain bg-white p-0.5 shadow-sm"
            />
            <div>
              <h2 id="tlb-share-title" className="font-extrabold text-[15px] text-[var(--ink)]">
                {lang === "en"
                  ? "Name Timeline Before Sharing"
                  : "Beri Nama Timeline Dahulu"}
              </h2>
              <p className="text-[11.5px] text-[var(--muted)]">
                Timeline Builder Online
              </p>
            </div>
          </div>

          <div className="p-5 flex flex-col gap-4">
            <p className="text-[13px] text-[var(--ink-2)]">
              {lang === "en"
                ? "Give this timeline a clear title so teammates recognize it:"
                : "Beri judul timeline agar rekan tim mudah mengenalinya saat link dibuka:"}
            </p>
            <input
              type="text"
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="inp w-full"
            />
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStep("share")}
                className="btn soft"
              >
                {lang === "en" ? "Skip" : "Lewati"}
              </button>
              <button type="submit" disabled={busy} className="btn primary">
                {lang === "en" ? "Save & Continue" : "Simpan & Lanjut"}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-[18px] shadow-2xl border border-[var(--line)] w-full max-w-[560px] max-h-[calc(100vh-40px)] flex flex-col overflow-hidden"
        >
          {/* Branded Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line)] bg-[linear-gradient(180deg,#FFF7ED,#FFFFFF)]">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src="/tlbicon.png"
                alt="Timeline Builder Online"
                className="w-9 h-9 rounded-xl object-contain bg-white p-0.5 border border-[var(--brand-200)] shadow-sm shrink-0"
              />
              <div className="min-w-0">
                <h2
                  id="tlb-share-title"
                  className="font-extrabold text-[15px] text-[var(--ink)] truncate"
                >
                  {lang === "en" ? "Share & Collaborate" : "Bagikan & Kolaborasi"}
                </h2>
                <p className="text-[12px] font-semibold text-[var(--brand-700)] truncate">
                  {displayName}
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

          <div className="p-5 flex flex-col gap-4 overflow-y-auto">
            {/* Link & General Access Card */}
            <div className="rounded-2xl border border-[var(--brand-200)] bg-[var(--brand-50)]/60 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-[12px] font-extrabold uppercase tracking-wider text-[var(--brand-800)]">
                  {lang === "en" ? "Link Access Mode" : "Mode Akses Link"}
                </div>
                <div className="inline-flex rounded-lg bg-white p-0.5 border border-[var(--brand-200)]">
                  <button
                    type="button"
                    disabled={!isOwner || busy || !info}
                    onClick={() =>
                      handleGeneralChange(
                        "restricted",
                        info?.project.generalRole || "viewer"
                      )
                    }
                    className={`px-2.5 py-1 rounded-md text-[11.5px] font-bold transition-colors ${
                      !isAnyone
                        ? "bg-[#1F1916] text-white"
                        : "text-[var(--ink-2)] hover:bg-[var(--brand-50)]"
                    }`}
                  >
                    {lang === "en" ? "Private (Invited)" : "Privat (Diundang)"}
                  </button>
                  <button
                    type="button"
                    disabled={!isOwner || busy || !info}
                    onClick={() =>
                      handleGeneralChange(
                        "anyone",
                        info?.project.generalRole || "viewer"
                      )
                    }
                    className={`px-2.5 py-1 rounded-md text-[11.5px] font-bold transition-colors ${
                      isAnyone
                        ? "bg-[var(--brand)] text-white"
                        : "text-[var(--ink-2)] hover:bg-[var(--brand-50)]"
                    }`}
                  >
                    {lang === "en" ? "Anyone with Link" : "Publik via Link"}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 flex-wrap text-[12px] text-[var(--ink-2)]">
                <span>
                  {isAnyone
                    ? info?.project.generalRole === "editor"
                      ? lang === "en"
                        ? "Anyone signed in with this link can edit in real time."
                        : "Siapa saja yang login dengan link ini dapat mengedit langsung."
                      : lang === "en"
                        ? "Anyone signed in with this link can view in real time."
                        : "Siapa saja yang login dengan link ini hanya dapat melihat."
                    : lang === "en"
                      ? "Only invited collaborators below can open this timeline."
                      : "Hanya kolaborator yang diundang di bawah yang dapat membuka timeline ini."}
                </span>

                {isAnyone && (
                  <div className="inline-flex rounded-lg bg-white p-0.5 border border-[var(--brand-200)] shrink-0">
                    <button
                      type="button"
                      disabled={!isOwner || busy}
                      onClick={() => handleGeneralChange("anyone", "viewer")}
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                        info?.project.generalRole === "viewer"
                          ? "bg-[var(--brand-700)] text-white"
                          : "text-[var(--ink-2)]"
                      }`}
                    >
                      {lang === "en" ? "Viewer" : "Pelihat"}
                    </button>
                    <button
                      type="button"
                      disabled={!isOwner || busy}
                      onClick={() => handleGeneralChange("anyone", "editor")}
                      className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                        info?.project.generalRole === "editor"
                          ? "bg-[var(--brand-700)] text-white"
                          : "text-[var(--ink-2)]"
                      }`}
                    >
                      Editor
                    </button>
                  </div>
                )}
              </div>

              {/* Direct URL Box */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl || (lang === "en" ? "Syncing link..." : "Menyiapkan link...")}
                  onFocus={(e) => e.currentTarget.select()}
                  className="inp flex-1 bg-white text-[12px] text-[var(--ink-2)] font-mono"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  disabled={!shareUrl}
                  className="btn primary shrink-0"
                >
                  <Icon name="copy" size="sm" />
                  <span>{lang === "en" ? "Copy Link" : "Salin Link"}</span>
                </button>
              </div>
            </div>

            {/* Add Collaborator by Email */}
            {isOwner && (
              <form onSubmit={handleAddPerson} className="flex flex-col gap-1.5">
                <label className="text-[11.5px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
                  {lang === "en"
                    ? "Invite Teammate by Email"
                    : "Undang Rekan via Email"}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder={
                      lang === "en"
                        ? "teammate@company.com"
                        : "email.rekan@perusahaan.com"
                    }
                    className="inp flex-1"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) =>
                      setInviteRole(e.target.value as "viewer" | "editor")
                    }
                    className="inp w-[108px]"
                  >
                    <option value="viewer">
                      {lang === "en" ? "Viewer" : "Pelihat"}
                    </option>
                    <option value="editor">Editor</option>
                  </select>
                  <button
                    type="submit"
                    disabled={busy || !emailInput.trim()}
                    className="btn primary shrink-0"
                  >
                    <Icon name="plus" size="sm" />
                    <span>{lang === "en" ? "Invite" : "Undang"}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Collaborators List */}
            <div className="flex flex-col gap-2">
              <div className="text-[11.5px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
                {lang === "en"
                  ? `Collaborators (${1 + (info?.members.length || 0)})`
                  : `Daftar Kolaborator (${1 + (info?.members.length || 0)})`}
              </div>

              {loading && !info ? (
                <div className="py-4 text-center text-[12.5px] text-[var(--muted)]">
                  {lang === "en" ? "Loading..." : "Memuat..."}
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {info?.owner && (
                    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-[var(--line)] bg-[#FAFBF9]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-8 h-8 rounded-full bg-[var(--brand)] text-white font-extrabold text-[12.5px] grid place-items-center shrink-0">
                          {(info.owner.name || info.owner.email || "O")[0].toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <div className="text-[13px] font-bold text-[var(--ink)] truncate">
                            {info.owner.name}{" "}
                            {info.owner.userId === currentUserId
                              ? lang === "en"
                                ? "(you)"
                                : "(Anda)"
                              : ""}
                          </div>
                          <div className="text-[11px] text-[var(--muted)] truncate">
                            {info.owner.email}
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[var(--brand-100)] text-[var(--brand-800)] shrink-0">
                        {lang === "en" ? "Owner" : "Pemilik"}
                      </span>
                    </div>
                  )}

                  {info?.members.map((m) => (
                    <div
                      key={m.userId}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-[var(--line)] bg-white"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-8 h-8 rounded-full bg-[#1F1916] text-white font-extrabold text-[12.5px] grid place-items-center shrink-0">
                          {(m.name || m.email || "U")[0].toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <div className="text-[13px] font-bold text-[var(--ink)] truncate">
                            {m.name}{" "}
                            {m.userId === currentUserId
                              ? lang === "en"
                                ? "(you)"
                                : "(Anda)"
                              : ""}
                          </div>
                          <div className="text-[11px] text-[var(--muted)] truncate">
                            {m.email}
                          </div>
                        </div>
                      </div>
                      {isOwner ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <select
                            disabled={busy}
                            value={m.role}
                            onChange={(e) =>
                              handleMemberRoleChange(
                                m.userId,
                                e.target.value as "viewer" | "editor"
                              )
                            }
                            className="inp py-1 px-2 text-[12px]"
                          >
                            <option value="viewer">
                              {lang === "en" ? "Viewer" : "Pelihat"}
                            </option>
                            <option value="editor">Editor</option>
                          </select>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleRemoveMember(m.userId)}
                            className="ibtn sm danger"
                            title={lang === "en" ? "Remove access" : "Hapus akses"}
                          >
                            <Icon name="trash" size="xs" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] font-bold uppercase text-[var(--muted)] shrink-0">
                          {m.role === "viewer"
                            ? lang === "en"
                              ? "Viewer"
                              : "Pelihat"
                            : "Editor"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-[var(--line)] bg-[#FAFBF9]">
            <button type="button" onClick={closeModal} className="btn primary">
              {lang === "en" ? "Done" : "Selesai"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
