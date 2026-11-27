"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/IconSprite";
import { SlidingPill } from "@/components/SlidingPill";
import {
  authClient,
  deleteCloudProject,
  listCloudProjects,
  loadCloudProject,
  saveCloudProject,
  type CloudProjectMeta,
} from "@/lib/authClient";
import { useTimeline } from "@/store/useTimelineStore";

function groupBucket(iso: string): "7d" | "30d" | "earlier" {
  const diffDays = (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays <= 7) return "7d";
  if (diffDays <= 30) return "30d";
  return "earlier";
}

export function ProjectDashboard() {
  const {
    lang,
    setLang,
    openCloudProject,
    createNewCloudProject,
    showNotice,
    notice,
  } = useTimeline();

  const { data: session } = authClient.useSession();
  const [items, setItems] = useState<CloudProjectMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<"all" | "mine" | "shared">("all");
  const [sortBy, setSortBy] = useState<"recent" | "alpha">("recent");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);

  const langSegRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listCloudProjects();
      setItems(list);
    } catch {
      showNotice(
        lang === "en"
          ? "Failed to load timelines."
          : "Gagal memuat daftar timeline."
      );
    } finally {
      setLoading(false);
    }
  }, [lang, showNotice]);

  useEffect(() => {
    const id = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(id);
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = items.filter((item) => {
      if (ownerFilter === "mine" && (item.role ?? "owner") !== "owner") {
        return false;
      }
      if (ownerFilter === "shared" && (item.role ?? "owner") === "owner") {
        return false;
      }
      if (q && !item.name.toLowerCase().includes(q)) return false;
      return true;
    });

    if (sortBy === "alpha") {
      return [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
    return [...list].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [items, ownerFilter, search, sortBy]);

  const grouped = useMemo(() => {
    if (sortBy === "alpha") {
      return [{ key: "alpha", label: lang === "en" ? "A – Z" : "A – Z", rows: filtered }];
    }
    const g7: CloudProjectMeta[] = [];
    const g30: CloudProjectMeta[] = [];
    const gEarlier: CloudProjectMeta[] = [];
    for (const item of filtered) {
      const b = groupBucket(item.updatedAt);
      if (b === "7d") g7.push(item);
      else if (b === "30d") g30.push(item);
      else gEarlier.push(item);
    }
    return [
      {
        key: "7d",
        label: lang === "en" ? "Previous 7 days" : "7 hari sebelumnya",
        rows: g7,
      },
      {
        key: "30d",
        label: lang === "en" ? "Previous 30 days" : "30 hari sebelumnya",
        rows: g30,
      },
      {
        key: "earlier",
        label: lang === "en" ? "Earlier" : "Sebelumnya",
        rows: gEarlier,
      },
    ].filter((g) => g.rows.length > 0);
  }, [filtered, lang, sortBy]);

  const handleCreateNew = async () => {
    setBusyId("new");
    try {
      await createNewCloudProject();
    } catch {
      showNotice(
        lang === "en"
          ? "Failed to create new timeline."
          : "Gagal membuat timeline baru."
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleOpen = async (item: CloudProjectMeta) => {
    setBusyId(item.id);
    try {
      const res = await loadCloudProject(item.id);
      openCloudProject({
        id: res.id,
        workspaceId: res.workspaceId ?? null,
        role: item.role ?? res.role ?? "owner",
        version: res.version,
        data: res.data,
      });
    } catch {
      showNotice(
        lang === "en" ? "Failed to open timeline." : "Gagal membuka timeline."
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setMenuOpenId(null);
    setBusyId(id);
    try {
      await deleteCloudProject(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
      showNotice(lang === "en" ? "Timeline deleted." : "Timeline dihapus.");
    } catch {
      showNotice(
        lang === "en" ? "Failed to delete timeline." : "Gagal menghapus timeline."
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleCopyLink = async (id: string) => {
    setMenuOpenId(null);
    const link = `${window.location.origin}/?project=${encodeURIComponent(id)}`;
    try {
      await navigator.clipboard.writeText(link);
      showNotice(lang === "en" ? "Link copied!" : "Link disalin!");
    } catch {
      showNotice(link);
    }
  };

  const handleDuplicate = async (item: CloudProjectMeta) => {
    setMenuOpenId(null);
    setBusyId(item.id);
    try {
      const loaded = await loadCloudProject(item.id);
      const copySuffix = lang === "en" ? " (Copy)" : " (Salinan)";
      const clonedName = `${loaded.name || item.name}${copySuffix}`.slice(0, 120);
      const clonedData = {
        ...loaded.data,
        name: clonedName,
        pages: loaded.data.pages.map((p, idx) =>
          idx === 0 ? { ...p, title: clonedName } : p
        ),
      };
      const saved = await saveCloudProject(null, clonedData);
      setItems((prev) => [
        {
          id: saved.id,
          name: saved.name,
          workspaceId: saved.workspaceId ?? null,
          role: "owner",
          version: saved.version,
          createdAt: saved.updatedAt,
          updatedAt: saved.updatedAt,
        },
        ...prev,
      ]);
      showNotice(
        lang === "en" ? "Timeline duplicated!" : "Timeline berhasil diduplikasi!"
      );
    } catch {
      showNotice(
        lang === "en" ? "Failed to duplicate timeline." : "Gagal menduplikasi timeline."
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      className="h-screen overflow-y-auto flex flex-col bg-white text-[var(--ink)]"
      onClick={() => {
        setMenuOpenId(null);
        setAccountOpen(false);
      }}
    >
      {/* Top Spreadsheet-style Header */}
      <header className="sticky top-0 z-40 h-16 px-4 sm:px-6 bg-white border-b border-[var(--line)] flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 shrink-0">
          <img
            src="/tlbicon.png"
            alt="Timeline Builder Online"
            className="w-9 h-9 rounded-xl object-contain bg-[var(--brand-50)] p-0.5 border border-[var(--brand-200)]"
          />
          <span className="font-extrabold text-[17px] tracking-tight text-[var(--ink)] hidden sm:inline">
            Timeline Builder <span className="text-[var(--brand)]">Online</span>
          </span>
        </div>

        {/* Search Input */}
        <div className="flex-1 max-w-[620px]">
          <div className="relative flex items-center">
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              className="absolute left-3.5 text-[var(--muted)] pointer-events-none"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                lang === "en" ? "Search timelines..." : "Telusuri timeline..."
              }
              className="w-full h-10 pl-10 pr-4 rounded-full bg-[#F3F4F6] focus:bg-white border border-transparent focus:border-[var(--brand)] focus:shadow-sm outline-none text-[13.5px] transition-all"
            />
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div
            ref={langSegRef}
            className="relative inline-flex rounded-lg bg-[#F3F4F6] p-0.5"
            role="group"
            aria-label="Language"
          >
            <SlidingPill
              containerRef={langSegRef}
              deps={[lang]}
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "6px",
                boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
              }}
            />
            <button
              type="button"
              onClick={() => setLang("id")}
              className={`relative z-10 px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${
                lang === "id" ? "on text-[var(--brand-700)]" : "text-[var(--muted)]"
              }`}
            >
              ID
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`relative z-10 px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${
                lang === "en" ? "on text-[var(--brand-700)]" : "text-[var(--muted)]"
              }`}
            >
              EN
            </button>
          </div>

          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setAccountOpen((o) => !o)}
              className="w-9 h-9 rounded-full bg-[var(--brand)] text-white font-extrabold text-[13.5px] grid place-items-center shadow-sm ring-2 ring-[var(--brand-100)] hover:brightness-105"
              aria-label="Account menu"
            >
              {(session?.user?.name || session?.user?.email || "U")[0].toUpperCase()}
            </button>
            {accountOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] w-60 bg-white rounded-2xl shadow-2xl border border-[var(--line)] p-2 z-50">
                <div className="px-2.5 py-2 border-b border-[var(--line-2)]">
                  <div className="font-extrabold text-[13px] truncate">
                    {session?.user?.name || "User"}
                  </div>
                  <div className="text-[11.5px] text-[var(--muted)] truncate">
                    {session?.user?.email}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    setAccountOpen(false);
                    await authClient.signOut();
                    showNotice(lang === "en" ? "Signed out." : "Berhasil keluar.");
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 mt-1 rounded-xl text-[13px] font-semibold text-[#C62828] hover:bg-[#FDECEC]"
                >
                  <Icon name="logout" size="sm" />
                  <span>{lang === "en" ? "Sign out" : "Keluar"}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Start a new timeline band */}
      <section className="bg-[#FAF7F4] border-b border-[var(--line)] py-7 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-[13.5px] font-bold text-[var(--ink-2)] mb-3.5">
            {lang === "en" ? "Start a new timeline" : "Memulai timeline baru"}
          </div>
          <div className="flex flex-wrap items-start gap-5">
            <button
              type="button"
              disabled={busyId === "new"}
              onClick={handleCreateNew}
              className="group flex flex-col items-start gap-2 text-left"
            >
              <div className="w-[152px] h-[116px] rounded-xl bg-white border border-[var(--line)] group-hover:border-[var(--brand)] group-hover:shadow-md transition-all grid place-items-center">
                <span className="w-12 h-12 rounded-full bg-[var(--brand-50)] text-[var(--brand)] grid place-items-center group-hover:scale-105 transition-transform">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </div>
              <span className="text-[13px] font-bold text-[var(--ink)]">
                {busyId === "new"
                  ? lang === "en"
                    ? "Creating..."
                    : "Membuat..."
                  : lang === "en"
                    ? "Blank timeline"
                    : "Timeline kosong"}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Recent / Shared Timelines List */}
      <main className="flex-1 py-6 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-col gap-4">
          {/* List Controls Header */}
          <div className="flex items-center justify-between gap-3 flex-wrap text-[12.5px]">
            <div className="font-extrabold text-[14px] text-[var(--ink)]">
              {lang === "en" ? "Recent timelines" : "Timeline terbaru"}
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <select
                value={ownerFilter}
                onChange={(e) =>
                  setOwnerFilter(e.target.value as "all" | "mine" | "shared")
                }
                className="px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-white font-semibold text-[12.5px] text-[var(--ink-2)] cursor-pointer"
              >
                <option value="all">
                  {lang === "en" ? "Owned by anyone" : "Milik siapa saja"}
                </option>
                <option value="mine">
                  {lang === "en" ? "Owned by me" : "Milik saya"}
                </option>
                <option value="shared">
                  {lang === "en" ? "Shared with me" : "Dibagikan dengan saya"}
                </option>
              </select>

              <button
                type="button"
                onClick={() => setSortBy((s) => (s === "recent" ? "alpha" : "recent"))}
                className="px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-white font-semibold text-[12.5px] text-[var(--ink-2)] hover:bg-[#FAF7F4]"
                title={lang === "en" ? "Toggle sort order" : "Ubah urutan"}
              >
                {sortBy === "recent"
                  ? lang === "en"
                    ? "Last updated"
                    : "Terakhir diubah"
                  : "A – Z"}
              </button>

              <button
                type="button"
                onClick={() => setViewMode((v) => (v === "list" ? "grid" : "list"))}
                className="ibtn sm border border-[var(--line)]"
                title={viewMode === "list" ? "Grid view" : "List view"}
              >
                {viewMode === "list" ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-[13px] text-[var(--muted)]">
              {lang === "en" ? "Loading your timelines..." : "Memuat daftar timeline..."}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-14 px-5 text-center rounded-2xl border border-dashed border-[var(--line)] bg-[#FAF7F4]">
              <p className="text-[13.5px] font-semibold text-[var(--ink-2)]">
                {search
                  ? lang === "en"
                    ? "No timelines match your search."
                    : "Tidak ada timeline yang cocok dengan pencarian."
                  : lang === "en"
                    ? "No timelines yet. Click 'Blank timeline' above to create your first one!"
                    : "Belum ada timeline. Klik 'Timeline kosong' di atas untuk membuat yang pertama!"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {grouped.map((group) => (
                <div key={group.key} className="flex flex-col gap-1.5">
                  <div className="px-2 py-1 text-[12px] font-bold text-[var(--muted)]">
                    {group.label}
                  </div>

                  {viewMode === "grid" ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {group.rows.map((item) => {
                        const role = item.role ?? "owner";
                        return (
                          <div
                            key={item.id}
                            onClick={() => void handleOpen(item)}
                            className="group relative rounded-xl border border-[var(--line)] hover:border-[var(--brand)] bg-white p-4 cursor-pointer transition-all hover:shadow-md flex flex-col gap-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <img
                                src="/tlbicon.png"
                                alt=""
                                className="w-7 h-7 rounded-lg object-contain bg-[var(--brand-50)] p-0.5"
                              />
                              <span className="text-[10.5px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[var(--ink-2)]">
                                {role === "owner"
                                  ? lang === "en"
                                    ? "Owner"
                                    : "Milik saya"
                                  : role}
                              </span>
                            </div>
                            <div className="font-bold text-[13.5px] text-[var(--ink)] truncate">
                              {item.name}
                            </div>
                            <div className="text-[11.5px] text-[var(--muted)]">
                              {new Date(item.updatedAt).toLocaleDateString(
                                lang === "en" ? "en-US" : "id-ID",
                                { day: "numeric", month: "short", year: "numeric" }
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--line-2)] border border-[var(--line)] rounded-xl bg-white">
                      {group.rows.map((item) => {
                        const role = item.role ?? "owner";
                        const isShared = role !== "owner" || Boolean(item.workspaceId);
                        return (
                          <div
                            key={item.id}
                            onClick={() => void handleOpen(item)}
                            className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--brand-50)]/60 cursor-pointer transition-colors relative"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <img
                                src="/tlbicon.png"
                                alt=""
                                className="w-6 h-6 rounded-md object-contain shrink-0"
                              />
                              <span className="font-semibold text-[13.5px] text-[var(--ink)] truncate">
                                {item.name}
                              </span>
                              {isShared && (
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  className="text-[var(--muted)] shrink-0"
                                >
                                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                  <circle cx="9" cy="7" r="4" />
                                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                              )}
                            </div>

                            <div className="hidden sm:block w-36 text-[12px] text-[var(--muted)] truncate">
                              {role === "owner"
                                ? lang === "en"
                                  ? "me"
                                  : "saya"
                                : item.lastEditedBy || role}
                            </div>

                            <div className="hidden md:block w-32 text-[12px] text-[var(--muted)] text-right">
                              {new Date(item.updatedAt).toLocaleDateString(
                                lang === "en" ? "en-US" : "id-ID",
                                { day: "numeric", month: "short", year: "numeric" }
                              )}
                            </div>

                            <div
                              className="relative shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                disabled={busyId === item.id}
                                onClick={() =>
                                  setMenuOpenId((cur) =>
                                    cur === item.id ? null : item.id
                                  )
                                }
                                className="w-8 h-8 rounded-full hover:bg-black/5 grid place-items-center text-[var(--muted)]"
                                aria-label="More options"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                  <circle cx="12" cy="5" r="1.8" />
                                  <circle cx="12" cy="12" r="1.8" />
                                  <circle cx="12" cy="19" r="1.8" />
                                </svg>
                              </button>
                              {menuOpenId === item.id && (
                                <div className="absolute right-0 top-[calc(100%+4px)] w-44 bg-white rounded-xl shadow-xl border border-[var(--line)] p-1.5 z-50">
                                  <button
                                    type="button"
                                    onClick={() => void handleDuplicate(item)}
                                    className="w-full text-left px-3 py-1.5 rounded-lg text-[12.5px] font-semibold hover:bg-[var(--brand-50)]"
                                  >
                                    {lang === "en" ? "Duplicate" : "Duplikat"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleCopyLink(item.id)}
                                    className="w-full text-left px-3 py-1.5 rounded-lg text-[12.5px] font-semibold hover:bg-[var(--brand-50)]"
                                  >
                                    {lang === "en" ? "Copy link" : "Salin link"}
                                  </button>
                                  {role === "owner" && (
                                    <button
                                      type="button"
                                      onClick={() => void handleDelete(item.id)}
                                      className="w-full text-left px-3 py-1.5 rounded-lg text-[12.5px] font-semibold text-[#C62828] hover:bg-[#FDECEC]"
                                    >
                                      {lang === "en" ? "Delete" : "Hapus"}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {notice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-[3000] px-4 py-2.5 rounded-xl bg-[var(--brand-900)] text-white text-[12.5px] font-semibold shadow-lg border border-white/15"
        >
          {notice}
        </div>
      )}
    </div>
  );
}
