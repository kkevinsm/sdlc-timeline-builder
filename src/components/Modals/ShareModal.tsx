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
    nextVal: string
  ) => {
    if (!cloudProjectId) return;
    setBusy(true);
    try {
      if (nextVal === "remove") {
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
      } else {
        const role = nextVal === "editor" ? "editor" : "viewer";
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
      }
    } catch {
      showNotice(
        lang === "en" ? "Failed to update access." : "Gagal memperbarui akses."
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
      showNotice(
        lang === "en" ? "Access updated" : "Akses diperbarui"
      );
    } catch {
      showNotice(
        lang === "en"
          ? "Failed to update general access."
          : "Gagal mengubah akses umum."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleCopyLink = async () => {
    if (!cloudProjectId) return;
    const link = `${window.location.origin}/?project=${encodeURIComponent(cloudProjectId)}`;
    try {
      await navigator.clipboard.writeText(link);
      showNotice(lang === "en" ? "Link copied!" : "Link disalin!");
    } catch {
      showNotice(link);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2000] bg-[#09140E]/45 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={closeModal}
      role="dialog"
      aria-modal="true"
    >
      {step === "name" ? (
        <form
          onSubmit={handleSaveNameBeforeShare}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-[24px] shadow-2xl w-full max-w-[420px] p-6 flex flex-col gap-4"
        >
          <h2 className="text-[20px] font-bold text-[#1F1F1F] leading-snug">
            {lang === "en"
              ? "Name before sharing"
              : "Beri nama sebelum dibagikan"}
          </h2>
          <p className="text-[13.5px] text-[#444746]">
            {lang === "en"
              ? "Give this untitled timeline a name before sharing:"
              : "Beri nama pada dokumen tanpa judul ini sebelum dibagikan:"}
          </p>
          <input
            type="text"
            autoFocus
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg border border-[#747775] focus:border-[#0B57D0] focus:ring-2 focus:ring-[#0B57D0]/20 outline-none text-[14px]"
          />
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStep("share")}
              className="px-4 py-2 rounded-full text-[13.5px] font-semibold text-[#0B57D0] hover:bg-[#EDF2FA]"
            >
              {lang === "en" ? "Skip" : "Lewati"}
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2 rounded-full text-[13.5px] font-semibold bg-[#0B57D0] text-white hover:bg-[#0842A0]"
            >
              {lang === "en" ? "Save" : "Simpan"}
            </button>
          </div>
        </form>
      ) : (
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-[24px] shadow-2xl w-full max-w-[540px] max-h-[calc(100vh-40px)] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <h2 className="text-[20px] font-semibold text-[#1F1F1F] truncate pr-4">
              {lang === "en"
                ? `Share "${displayName}"`
                : `Bagikan "${displayName}"`}
            </h2>
            <button
              type="button"
              onClick={closeModal}
              aria-label="Close"
              className="w-8 h-8 rounded-full grid place-items-center text-[#444746] hover:bg-[#F0F4F9]"
            >
              <Icon name="x" size="sm" />
            </button>
          </div>

          <div className="px-6 pb-5 flex flex-col gap-5 overflow-y-auto">
            {/* Add people input */}
            {isOwner && (
              <form onSubmit={handleAddPerson} className="flex items-center gap-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder={
                    lang === "en"
                      ? "Add people by email address"
                      : "Tambahkan orang berdasarkan email"
                  }
                  className="flex-1 px-3.5 py-2.5 rounded-lg border border-[#747775] focus:border-[#0B57D0] focus:ring-2 focus:ring-[#0B57D0]/20 outline-none text-[13.5px]"
                />
                <select
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(e.target.value as "viewer" | "editor")
                  }
                  className="px-2.5 py-2.5 rounded-lg border border-[#C4C7C5] bg-[#F8FAFD] text-[13px] font-medium text-[#1F1F1F]"
                >
                  <option value="viewer">
                    {lang === "en" ? "Viewer" : "Pelihat"}
                  </option>
                  <option value="editor">Editor</option>
                </select>
                <button
                  type="submit"
                  disabled={busy || !emailInput.trim()}
                  className="px-4 py-2.5 rounded-lg bg-[#0B57D0] text-white text-[13px] font-semibold hover:bg-[#0842A0] disabled:opacity-50"
                >
                  {lang === "en" ? "Add" : "Undang"}
                </button>
              </form>
            )}

            {/* People with access */}
            <div className="flex flex-col gap-2.5">
              <div className="text-[13.5px] font-semibold text-[#1F1F1F]">
                {lang === "en"
                  ? "People with access"
                  : "Orang yang memiliki akses"}
              </div>
              {loading && !info ? (
                <div className="text-[12.5px] text-[#5F6368] py-2">
                  {lang === "en" ? "Loading..." : "Memuat..."}
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {info?.owner && (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 rounded-full bg-[#7E57C2] text-white font-semibold text-[14px] grid place-items-center shrink-0">
                          {(info.owner.name || info.owner.email || "O")[0].toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <div className="text-[13.5px] font-semibold text-[#1F1F1F] truncate">
                            {info.owner.name}{" "}
                            {info.owner.userId === currentUserId
                              ? lang === "en"
                                ? "(you)"
                                : "(Anda)"
                              : ""}
                          </div>
                          <div className="text-[12px] text-[#5F6368] truncate">
                            {info.owner.email}
                          </div>
                        </div>
                      </div>
                      <span className="text-[12.5px] text-[#5F6368] shrink-0">
                        {lang === "en" ? "Owner" : "Pemilik"}
                      </span>
                    </div>
                  )}

                  {info?.members.map((m) => (
                    <div
                      key={m.userId}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 rounded-full bg-[#1976D2] text-white font-semibold text-[14px] grid place-items-center shrink-0">
                          {(m.name || m.email || "U")[0].toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <div className="text-[13.5px] font-semibold text-[#1F1F1F] truncate">
                            {m.name}{" "}
                            {m.userId === currentUserId
                              ? lang === "en"
                                ? "(you)"
                                : "(Anda)"
                              : ""}
                          </div>
                          <div className="text-[12px] text-[#5F6368] truncate">
                            {m.email}
                          </div>
                        </div>
                      </div>
                      {isOwner ? (
                        <select
                          disabled={busy}
                          value={m.role}
                          onChange={(e) =>
                            handleMemberRoleChange(m.userId, e.target.value)
                          }
                          className="px-2.5 py-1.5 rounded-lg border border-transparent hover:bg-[#F0F4F9] text-[13px] font-medium text-[#1F1F1F] cursor-pointer"
                        >
                          <option value="viewer">
                            {lang === "en" ? "Viewer" : "Pelihat"}
                          </option>
                          <option value="editor">Editor</option>
                          <option value="remove">
                            {lang === "en" ? "Remove access" : "Hapus akses"}
                          </option>
                        </select>
                      ) : (
                        <span className="text-[12.5px] text-[#5F6368] capitalize shrink-0">
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

            {/* General access */}
            <div className="flex flex-col gap-2.5">
              <div className="text-[13.5px] font-semibold text-[#1F1F1F]">
                {lang === "en" ? "General access" : "Akses umum"}
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-9 h-9 rounded-full grid place-items-center shrink-0 ${
                      info?.project.generalAccess === "anyone"
                        ? "bg-[#C4EED0] text-[#0F5223]"
                        : "bg-[#E1E3E1] text-[#444746]"
                    }`}
                  >
                    {info?.project.generalAccess === "anyone" ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    )}
                  </span>
                  <div className="min-w-0">
                    <select
                      disabled={!isOwner || busy || !info}
                      value={info?.project.generalAccess || "restricted"}
                      onChange={(e) =>
                        handleGeneralChange(
                          e.target.value as GeneralAccess,
                          info?.project.generalRole || "viewer"
                        )
                      }
                      className="font-semibold text-[13.5px] text-[#1F1F1F] bg-transparent hover:bg-[#F0F4F9] rounded-md px-1.5 py-0.5 -ml-1.5 cursor-pointer disabled:cursor-default"
                    >
                      <option value="restricted">
                        {lang === "en" ? "Restricted" : "Dibatasi"}
                      </option>
                      <option value="anyone">
                        {lang === "en"
                          ? "Anyone with the link"
                          : "Siapa saja yang memiliki link"}
                      </option>
                    </select>
                    <div className="text-[12px] text-[#5F6368] leading-snug">
                      {info?.project.generalAccess === "anyone"
                        ? info.project.generalRole === "editor"
                          ? lang === "en"
                            ? "Anyone signed in with the link can edit"
                            : "Siapa saja yang login dengan link dapat mengedit"
                          : lang === "en"
                            ? "Anyone signed in with the link can view"
                            : "Siapa saja yang login dengan link dapat melihat"
                        : lang === "en"
                          ? "Only people with access can open with the link"
                          : "Hanya orang yang memiliki akses yang dapat membuka dengan link"}
                    </div>
                  </div>
                </div>

                {info?.project.generalAccess === "anyone" && (
                  <select
                    disabled={!isOwner || busy}
                    value={info.project.generalRole}
                    onChange={(e) =>
                      handleGeneralChange(
                        "anyone",
                        e.target.value as "viewer" | "editor"
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-[#F0F4F9] hover:bg-[#E1E5EA] text-[13px] font-medium text-[#1F1F1F] shrink-0 cursor-pointer"
                  >
                    <option value="viewer">
                      {lang === "en" ? "Viewer" : "Pelihat"}
                    </option>
                    <option value="editor">Editor</option>
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#E0E3E7]">
            <button
              type="button"
              onClick={handleCopyLink}
              disabled={!cloudProjectId}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#747775] text-[#0B57D0] text-[13.5px] font-semibold hover:bg-[#EDF2FA]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <span>{lang === "en" ? "Copy link" : "Salin link"}</span>
            </button>
            <button
              type="button"
              onClick={closeModal}
              className="px-6 py-2 rounded-full bg-[#0B57D0] text-white text-[13.5px] font-semibold hover:bg-[#0842A0]"
            >
              {lang === "en" ? "Done" : "Selesai"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
