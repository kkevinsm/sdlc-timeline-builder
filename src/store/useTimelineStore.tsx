"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createDefaultPage,
  createDefaultProject,
  nowUTC7,
  todayISO_UTC7,
  weekOfDate,
} from "@/constants/defaults";
import { translate, type I18nKey } from "@/constants/i18n";
import { LANG_STORAGE_KEY, LS_STORAGE_KEY, MONTH_NAMES_ID } from "@/constants/theme";
import { cascadeShiftRows } from "@/engine/dependency";
import {
  authClient,
  listCloudProjects,
  loadCloudProject,
  saveCloudProject,
  type CollaboratorCursor,
  type MemberRole,
  type PresenceUser,
} from "@/lib/authClient";
import {
  applyTimelineOps,
  diffProjectOps,
  type TimelineOp,
} from "@/lib/syncOps";
import type {
  DepType,
  LangCode,
  PageData,
  ProjectData,
  ScaleMode,
  SidebarTab,
  TimelineRow,
} from "@/types/timeline";

const MAX_HISTORY = 60;

export type ModalKind = "paste" | "plan" | "export" | "present" | "help" | "auth" | "cloud" | "team" | "changes" | null;

interface TimelineContextValue {
  project: ProjectData;
  activePage: PageData;
  cloudProjectId: string | null;
  setCloudProjectId: (id: string | null) => void;
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string | null) => void;
  cloudProjectRole: MemberRole;
  setCloudProjectRole: (role: MemberRole) => void;
  cloudProjectVersion: number | null;
  setCloudProjectVersion: (version: number | null) => void;
  roomUsers: PresenceUser[];
  roomConnected: boolean;
  remoteCursors: Record<string, CollaboratorCursor>;
  reportActiveRow: (rowId: string | null) => void;
  lang: LangCode;
  sidebarTab: SidebarTab;
  sidebarCollapsed: boolean;
  saveState: "saved" | "saving";
  canUndo: boolean;
  canRedo: boolean;
  notice: string | null;
  activeModal: ModalKind;
  openModal: (modal: Exclude<ModalKind, null>) => void;
  closeModal: () => void;
  t: (key: I18nKey) => string;
  setLang: (lang: LangCode) => void;
  setSidebarTab: (tab: SidebarTab) => void;
  toggleSidebar: () => void;
  setMode: (mode: ScaleMode) => void;
  setZoom: (zoom: number) => void;
  updateActivePage: (
    patch: Partial<PageData> | ((prev: PageData) => PageData),
    recordHistory?: boolean
  ) => void;
  setActivePage: (id: number) => void;
  addPage: () => void;
  closePage: (id: number) => void;
  renamePage: (id: number, name: string) => void;
  addGroup: (name?: string) => void;
  addTask: (name?: string) => void;
  appendRows: (rows: TimelineRow[]) => void;
  updateRow: (id: string, patch: Partial<TimelineRow>) => void;
  updateBarAndCascade: (id: string, barPatch: Partial<NonNullable<TimelineRow["bar"]>>) => void;
  addDependency: (taskId: string, predId: string, type: DepType) => void;
  removeDependency: (taskId: string, predId: string) => void;
  deleteRow: (id: string) => void;
  duplicateRow: (id: string) => void;
  addTaskAfter: (afterId: string) => void;
  moveRow: (id: string, dir: -1 | 1) => void;
  reorderRow: (fromId: string, toId: string) => void;
  toggleGroupCollapse: (id: string) => void;
  expandAllGroups: () => void;
  collapseAllGroups: () => void;
  resetProject: () => void;
  loadProject: (data: ProjectData) => void;
  openCloudProject: (payload: {
    id: string;
    workspaceId?: string | null;
    role?: MemberRole;
    version?: number;
    data: ProjectData;
  }) => void;
  undo: () => void;
  redo: () => void;
  showNotice: (msg: string) => void;
}

const TimelineContext = createContext<TimelineContextValue | null>(null);

const userProjKey = (uid: string) => `tlb.proj.v1.${uid}`;
const userCloudIdKey = (uid: string) => `tlb.cloudId.v1.${uid}`;

export function TimelineProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const userId = session?.user?.id || null;

  const [lang, setLangState] = useState<LangCode>("id");
  const [project, setProject] = useState<ProjectData>(() =>
    createDefaultProject("id")
  );
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("slide");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const [past, setPast] = useState<ProjectData[]>([]);
  const [future, setFuture] = useState<ProjectData[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ModalKind>(null);
  const [cloudProjectId, setCloudProjectId] = useState<string | null>(null);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [cloudProjectRole, setCloudProjectRole] = useState<MemberRole>("owner");
  const [cloudProjectVersion, setCloudProjectVersion] = useState<number | null>(null);
  const [roomUsers, setRoomUsers] = useState<PresenceUser[]>([]);
  const [roomConnected, setRoomConnected] = useState(false);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, CollaboratorCursor>>({});
  const [hydratedForUser, setHydratedForUser] = useState<string | null>(null);

  const openModal = useCallback((m: Exclude<ModalKind, null>) => setActiveModal(m), []);
  const closeModal = useCallback(() => setActiveModal(null), []);

  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const lastSyncedJsonRef = useRef<string>("");
  const lastSyncedProjectRef = useRef<ProjectData | null>(null);
  const prevBroadcastProjectRef = useRef<ProjectData | null>(null);
  const cloudVersionRef = useRef<number | null>(null);
  const creatingCloudRef = useRef<boolean>(false);

  useEffect(() => {
    cloudVersionRef.current = cloudProjectVersion;
  }, [cloudProjectVersion]);

  // Hydrate language once on mount & clear legacy shared key
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        const savedLang = localStorage.getItem(LANG_STORAGE_KEY);
        if (savedLang === "en" || savedLang === "id") {
          setLangState(savedLang);
        }
        localStorage.removeItem(LS_STORAGE_KEY);
      } catch {
        // Ignore
      }
    }, 0);
    return () => clearTimeout(id);
  }, []);

  // Load isolated per-user workspace whenever authenticated userId changes
  useEffect(() => {
    if (sessionPending) return;
    let cancelled = false;

    const syncPagesWithUTC7 = (parsed: ProjectData): ProjectData => {
      const now = nowUTC7();
      const todayIso = todayISO_UTC7();
      const curMonth = MONTH_NAMES_ID[now.getMonth()];
      const curWeek = weekOfDate(now);
      const curYear = now.getFullYear();
      return {
        ...parsed,
        pages: parsed.pages.map((p) =>
          p.today
            ? p
            : {
                ...p,
                today: todayIso,
                cm: curMonth,
                cw: curWeek,
                cy: curYear,
              }
        ),
      };
    };

    const loadUserWorkspace = async () => {
      setPast([]);
      setFuture([]);

      if (!userId) {
        setProject(createDefaultProject(lang));
        setCloudProjectId(null);
        setActiveWorkspaceId(null);
        setCloudProjectRole("owner");
        setCloudProjectVersion(null);
        setHydratedForUser(null);
        return;
      }

      try {
        const savedCid = localStorage.getItem(userCloudIdKey(userId));
        if (savedCid) {
          try {
            const latest = await loadCloudProject(savedCid);
            if (!cancelled && latest?.data?.pages?.length > 0) {
              const synced = syncPagesWithUTC7(latest.data);
              lastSyncedJsonRef.current = JSON.stringify(synced);
              lastSyncedProjectRef.current = synced;
              prevBroadcastProjectRef.current = synced;
              cloudVersionRef.current = latest.version ?? null;
              setProject(synced);
              setCloudProjectId(latest.id);
              setActiveWorkspaceId(latest.workspaceId ?? null);
              setCloudProjectRole(latest.role ?? "owner");
              setCloudProjectVersion(latest.version ?? null);
              setHydratedForUser(userId);
              return;
            }
          } catch {
            // Fall through to localStorage draft if offline or deleted
          }
        }

        const raw = localStorage.getItem(userProjKey(userId));
        if (raw) {
          const parsed = JSON.parse(raw) as ProjectData;
          if (parsed && Array.isArray(parsed.pages) && parsed.pages.length > 0) {
            if (!cancelled) {
              const synced = syncPagesWithUTC7(parsed);
              lastSyncedJsonRef.current = JSON.stringify(synced);
              lastSyncedProjectRef.current = synced;
              prevBroadcastProjectRef.current = synced;
              setProject(synced);
              setCloudProjectId(savedCid || null);
              setHydratedForUser(userId);
            }
            return;
          }
        }

        // No local draft for this user: check their cloud projects in D1
        const cloudList = await listCloudProjects();
        if (!cancelled && cloudList.length > 0) {
          const latest = await loadCloudProject(cloudList[0].id);
          if (!cancelled && latest?.data?.pages?.length > 0) {
            const synced = syncPagesWithUTC7(latest.data);
            lastSyncedJsonRef.current = JSON.stringify(synced);
            lastSyncedProjectRef.current = synced;
            prevBroadcastProjectRef.current = synced;
            cloudVersionRef.current = latest.version ?? null;
            setProject(synced);
            setCloudProjectId(latest.id);
            setActiveWorkspaceId(latest.workspaceId ?? null);
            setCloudProjectRole(cloudList[0].role ?? "owner");
            setCloudProjectVersion(latest.version ?? null);
            setHydratedForUser(userId);
            return;
          }
        }
      } catch {
        // Fallback to fresh empty default project
      }

      if (!cancelled) {
        setProject(createDefaultProject(lang));
        setCloudProjectId(null);
        setHydratedForUser(userId);
      }
    };

    const timer = setTimeout(() => {
      void loadUserWorkspace();
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [userId, sessionPending, lang]);

  // Debounced autosave scoped strictly to the active userId
  useEffect(() => {
    if (!userId || hydratedForUser !== userId) return;
    const timer = setTimeout(async () => {
      setSaveState("saving");
      try {
        localStorage.setItem(userProjKey(userId), JSON.stringify(project));
        if (cloudProjectId) {
          localStorage.setItem(userCloudIdKey(userId), cloudProjectId);
        } else {
          localStorage.removeItem(userCloudIdKey(userId));
        }
      } catch {
        // Ignore quota errors
      }
      if (!cloudProjectId && cloudProjectRole !== "viewer") {
        if (!creatingCloudRef.current) {
          creatingCloudRef.current = true;
          try {
            const serialized = JSON.stringify(project);
            const res = await saveCloudProject(null, project, {
              workspaceId: activeWorkspaceId,
            });
            lastSyncedJsonRef.current = serialized;
            lastSyncedProjectRef.current = project;
            prevBroadcastProjectRef.current = project;
            cloudVersionRef.current = res.version;
            setCloudProjectId(res.id);
            setCloudProjectVersion(res.version);
            setCloudProjectRole("owner");
            try {
              localStorage.setItem(userCloudIdKey(userId), res.id);
            } catch {
              // Ignore
            }
          } catch {
            // Keep local draft safe if offline/expired
          } finally {
            creatingCloudRef.current = false;
          }
        }
      } else if (cloudProjectId && cloudProjectRole !== "viewer") {
        const serialized = JSON.stringify(project);
        if (serialized === lastSyncedJsonRef.current) {
          setSaveState("saved");
          return;
        }
        try {
          const res = await saveCloudProject(cloudProjectId, project, {
            workspaceId: activeWorkspaceId,
            expectedVersion: cloudVersionRef.current ?? undefined,
          });
          lastSyncedJsonRef.current = serialized;
          lastSyncedProjectRef.current = project;
          cloudVersionRef.current = res.version;
          setCloudProjectVersion(res.version);
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: "state_update",
                version: res.version,
                updatedAt: res.updatedAt,
                data: project,
              })
            );
          }
        } catch (err) {
          if (err instanceof Error && err.message === "CONFLICT") {
            try {
              const latest = await loadCloudProject(cloudProjectId);
              if (latest?.data?.pages?.length > 0) {
                const localOps = lastSyncedProjectRef.current
                  ? diffProjectOps(lastSyncedProjectRef.current, project)
                  : [];
                const merged =
                  localOps.length > 0
                    ? applyTimelineOps(latest.data, localOps)
                    : latest.data;

                let finalVersion = latest.version ?? null;
                if (localOps.length > 0) {
                  const savedMerged = await saveCloudProject(
                    cloudProjectId,
                    merged,
                    {
                      workspaceId: activeWorkspaceId,
                      expectedVersion: latest.version,
                    }
                  );
                  finalVersion = savedMerged.version;
                }

                lastSyncedJsonRef.current = JSON.stringify(merged);
                lastSyncedProjectRef.current = merged;
                prevBroadcastProjectRef.current = merged;
                cloudVersionRef.current = finalVersion;
                setCloudProjectVersion(finalVersion);
                setProject(merged);
                if (
                  localOps.length > 0 &&
                  wsRef.current?.readyState === WebSocket.OPEN
                ) {
                  wsRef.current.send(
                    JSON.stringify({
                      type: "state_update",
                      version: finalVersion,
                      updatedAt: new Date().toISOString(),
                      data: merged,
                    })
                  );
                }
                setNotice(
                  lang === "en"
                    ? "Merged concurrent edits from team."
                    : "Menggabungkan perubahan bersamaan dari tim."
                );
              }
            } catch {
              // Ignore reload error
            }
          }
          // Keep local draft safe if offline/expired
        }
      }
      setSaveState("saved");
    }, 350);
    return () => clearTimeout(timer);
  }, [project, userId, hydratedForUser, cloudProjectId, activeWorkspaceId, cloudProjectRole, lang]);

  const setLang = useCallback((next: LangCode) => {
    setLangState(next);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // Ignore
    }
  }, []);

  const t = useCallback(
    (key: I18nKey) => translate(lang, key),
    [lang]
  );

  const showNotice = useCallback((msg: string) => {
    setNotice(msg);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setNotice(null), 2600);
  }, []);

  // Real-time WebSocket room connection for active cloud project
  useEffect(() => {
    if (!userId || hydratedForUser !== userId || !cloudProjectId || typeof window === "undefined") {
      wsRef.current?.close();
      wsRef.current = null;
      const resetId = setTimeout(() => {
        setRoomConnected(false);
        setRoomUsers([]);
        setRemoteCursors({});
      }, 0);
      return () => clearTimeout(resetId);
    }

    let closed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let pingTimer: ReturnType<typeof setInterval> | null = null;
    let backoffMs = 1000;

    const connect = () => {
      if (closed) return;
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${proto}//${window.location.host}/api/rooms/${encodeURIComponent(cloudProjectId)}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (closed) return;
        backoffMs = 1000;
        setRoomConnected(true);
        // Catch up from D1 on connect/reconnect in case updates happened while offline
        void loadCloudProject(cloudProjectId)
          .then((latest) => {
            if (
              closed ||
              !latest?.data?.pages?.length ||
              (latest.version != null && latest.version === cloudVersionRef.current)
            ) {
              return;
            }
            lastSyncedJsonRef.current = JSON.stringify(latest.data);
            lastSyncedProjectRef.current = latest.data;
            prevBroadcastProjectRef.current = latest.data;
            cloudVersionRef.current = latest.version ?? null;
            setCloudProjectVersion(latest.version ?? null);
            setProject(latest.data);
          })
          .catch(() => {
            // Ignore transient catch-up errors
          });
        pingTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        if (closed || typeof event.data !== "string") return;
        try {
          const msg = JSON.parse(event.data) as {
            type?: string;
            users?: PresenceUser[];
            senderId?: string;
            senderName?: string;
            version?: number | null;
            ops?: TimelineOp[];
            data?: ProjectData;
            userId?: string;
            name?: string;
            color?: string;
            pageId?: number | null;
            rowId?: string | null;
          };
          if (msg.type === "presence") {
            const list = Array.isArray(msg.users) ? msg.users : [];
            setRoomUsers(list);
            const activeIds = new Set(list.map((u) => u.userId));
            setRemoteCursors((prev) => {
              const next: Record<string, CollaboratorCursor> = {};
              for (const [uid, cur] of Object.entries(prev)) {
                if (activeIds.has(uid)) next[uid] = cur;
              }
              return next;
            });
          } else if (msg.type === "cursor" && msg.userId && msg.userId !== userId) {
            const uid = msg.userId;
            setRemoteCursors((prev) => ({
              ...prev,
              [uid]: {
                userId: uid,
                name: msg.name || "User",
                color: msg.color || "#1D4ED8",
                pageId: msg.pageId ?? null,
                rowId: msg.rowId ?? null,
                updatedAt: Date.now(),
              },
            }));
          } else if (
            msg.type === "remote_ops" &&
            Array.isArray(msg.ops) &&
            msg.ops.length > 0
          ) {
            setProject((prev) => {
              const merged = applyTimelineOps(prev, msg.ops!);
              lastSyncedJsonRef.current = JSON.stringify(merged);
              prevBroadcastProjectRef.current = merged;
              return merged;
            });
            if (lastSyncedProjectRef.current) {
              lastSyncedProjectRef.current = applyTimelineOps(
                lastSyncedProjectRef.current,
                msg.ops
              );
            }
          } else if (msg.type === "remote_update" && msg.data?.pages?.length) {
            lastSyncedJsonRef.current = JSON.stringify(msg.data);
            lastSyncedProjectRef.current = msg.data;
            prevBroadcastProjectRef.current = msg.data;
            if (typeof msg.version === "number") {
              cloudVersionRef.current = msg.version;
              setCloudProjectVersion(msg.version);
            }
            setProject(msg.data);
            if (msg.senderName && msg.senderId !== userId) {
              showNotice(
                lang === "en"
                  ? `Updated by ${msg.senderName}`
                  : `Diperbarui oleh ${msg.senderName}`
              );
            }
          }
        } catch {
          // Ignore malformed WS message
        }
      };

      ws.onclose = () => {
        if (pingTimer) {
          clearInterval(pingTimer);
          pingTimer = null;
        }
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
        setRoomConnected(false);
        if (!closed) {
          reconnectTimer = setTimeout(connect, backoffMs);
          backoffMs = Math.min(backoffMs * 2, 10000);
        }
      };
    };

    const initTimer = setTimeout(connect, 0);

    return () => {
      closed = true;
      clearTimeout(initTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (pingTimer) clearInterval(pingTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [userId, hydratedForUser, cloudProjectId, lang, showNotice]);

  // Immediate granular op broadcast over WebSocket on local project edits
  useEffect(() => {
    if (
      !userId ||
      hydratedForUser !== userId ||
      !cloudProjectId ||
      cloudProjectRole === "viewer"
    ) {
      prevBroadcastProjectRef.current = project;
      return;
    }

    if (JSON.stringify(project) === lastSyncedJsonRef.current) {
      prevBroadcastProjectRef.current = project;
      return;
    }

    if (
      prevBroadcastProjectRef.current &&
      wsRef.current?.readyState === WebSocket.OPEN
    ) {
      const ops = diffProjectOps(prevBroadcastProjectRef.current, project);
      if (ops.length > 0) {
        wsRef.current.send(JSON.stringify({ type: "ops", ops }));
      }
    }
    prevBroadcastProjectRef.current = project;
  }, [project, userId, hydratedForUser, cloudProjectId, cloudProjectRole]);

  const reportActiveRow = useCallback(
    (rowId: string | null) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) return;
      wsRef.current.send(
        JSON.stringify({
          type: "cursor",
          pageId: project.activePageId,
          rowId,
        })
      );
    },
    [project.activePageId]
  );

  const commitProject = useCallback(
    (updater: (prev: ProjectData) => ProjectData, recordHistory = true) => {
      setProject((prev) => {
        const next = updater(prev);
        if (next === prev) return prev;
        if (recordHistory) {
          setPast((h) => [...h.slice(-(MAX_HISTORY - 1)), prev]);
          setFuture([]);
        }
        return next;
      });
    },
    []
  );

  const activePage = useMemo(() => {
    return (
      project.pages.find((p) => p.id === project.activePageId) ||
      project.pages[0]
    );
  }, [project]);

  const updateActivePage = useCallback(
    (
      patch: Partial<PageData> | ((prev: PageData) => PageData),
      recordHistory = true
    ) => {
      commitProject((prev) => {
        const pages = prev.pages.map((p) => {
          if (p.id !== prev.activePageId) return p;
          return typeof patch === "function" ? patch(p) : { ...p, ...patch };
        });
        return { ...prev, pages };
      }, recordHistory);
    },
    [commitProject]
  );

  const setMode = useCallback(
    (mode: ScaleMode) => {
      commitProject((prev) => ({ ...prev, mode }), false);
    },
    [commitProject]
  );

  const setZoom = useCallback(
    (zoom: number) => {
      const clamped = Math.max(10, Math.min(200, Math.round(zoom)));
      commitProject((prev) => ({ ...prev, zoom: clamped }), false);
    },
    [commitProject]
  );

  const setActivePage = useCallback(
    (id: number) => {
      commitProject((prev) => ({ ...prev, activePageId: id }), false);
    },
    [commitProject]
  );

  const addPage = useCallback(() => {
    commitProject((prev) => {
      const maxId = prev.pages.reduce((m, p) => Math.max(m, p.id), 0);
      const nextId = maxId + 1;
      const base =
        prev.pages.find((p) => p.id === prev.activePageId) || prev.pages[0];
      const fresh = createDefaultPage(nextId, lang);
      const page: PageData = base
        ? {
            ...fresh,
            accent: base.accent,
            tgtc: base.tgtc,
            logl: base.logl,
            logr: base.logr,
            logoL: base.logoL,
            logoR: base.logoR,
            loglc: base.loglc,
            logrc: base.logrc,
            months: base.months.map((m) => ({
              ...m,
              weeks: [...m.weeks],
              hiddenWeeks: m.hiddenWeeks ? [...m.hiddenWeeks] : [],
            })),
            workDays: [...base.workDays],
          }
        : fresh;
      return {
        ...prev,
        activePageId: nextId,
        pages: [...prev.pages, page],
      };
    }, true);
  }, [commitProject, lang]);

  const closePage = useCallback(
    (id: number) => {
      commitProject((prev) => {
        if (prev.pages.length <= 1) return prev;
        const idx = prev.pages.findIndex((p) => p.id === id);
        const pages = prev.pages.filter((p) => p.id !== id);
        const activePageId =
          prev.activePageId === id
            ? pages[Math.max(0, idx - 1)].id
            : prev.activePageId;
        return { ...prev, pages, activePageId };
      }, true);
    },
    [commitProject]
  );

  const renamePage = useCallback(
    (id: number, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      commitProject(
        (prev) => ({
          ...prev,
          pages: prev.pages.map((p) =>
            p.id === id ? { ...p, name: trimmed } : p
          ),
        }),
        true
      );
    },
    [commitProject]
  );

  const resetProject = useCallback(() => {
    commitProject(() => createDefaultProject(lang), true);
  }, [commitProject, lang]);

  const loadProject = useCallback(
    (data: ProjectData) => {
      commitProject(() => data, true);
    },
    [commitProject]
  );

  const openCloudProject = useCallback(
    (payload: {
      id: string;
      workspaceId?: string | null;
      role?: MemberRole;
      version?: number;
      data: ProjectData;
    }) => {
      lastSyncedJsonRef.current = JSON.stringify(payload.data);
      lastSyncedProjectRef.current = payload.data;
      prevBroadcastProjectRef.current = payload.data;
      cloudVersionRef.current = payload.version ?? null;
      setPast([]);
      setFuture([]);
      setProject(payload.data);
      setCloudProjectId(payload.id);
      setActiveWorkspaceId(payload.workspaceId ?? null);
      setCloudProjectRole(payload.role ?? "owner");
      setCloudProjectVersion(payload.version ?? null);
    },
    []
  );

  const addGroup = useCallback(
    (name?: string) => {
      updateActivePage((prev) => {
        const count = prev.rows.filter((r) => r.type === "group").length + 1;
        const row: TimelineRow = {
          id: `grp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: "group",
          name: name?.trim() || `${lang === "en" ? "Phase" : "Fase"} ${count}`,
          collapsed: false,
        };
        return { ...prev, rows: [...prev.rows, row] };
      }, true);
    },
    [lang, updateActivePage]
  );

  const addTask = useCallback(
    (name?: string) => {
      updateActivePage((prev) => {
        const count = prev.rows.filter((r) => r.type === "task").length + 1;
        const firstMonth = prev.months[0];
        const startMonth = prev.cm || firstMonth?.name || "Januari";
        const startYear = prev.cy || firstMonth?.year || prev.year;
        const startWeek = prev.cw || 1;
        const row: TimelineRow = {
          id: `tsk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: "task",
          name: name?.trim() || `Task ${count}`,
          owner: "",
          bar: {
            startMonth,
            startWeek,
            startYear,
            endMonth: startMonth,
            endWeek: startWeek,
            endYear: startYear,
            progress: 0,
            status: "notstarted",
          },
          deps: [],
        };
        return { ...prev, rows: [...prev.rows, row] };
      }, true);
    },
    [updateActivePage]
  );

  const updateRow = useCallback(
    (id: string, patch: Partial<TimelineRow>) => {
      updateActivePage(
        (prev) => ({
          ...prev,
          rows: prev.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        }),
        true
      );
    },
    [updateActivePage]
  );

  const appendRows = useCallback(
    (newRows: TimelineRow[]) => {
      if (newRows.length === 0) return;
      updateActivePage(
        (prev) => ({
          ...prev,
          rows: [...prev.rows, ...newRows],
        }),
        true
      );
    },
    [updateActivePage]
  );

  const updateBarAndCascade = useCallback(
    (id: string, barPatch: Partial<NonNullable<TimelineRow["bar"]>>) => {
      updateActivePage((prev) => {
        const updatedRows = prev.rows.map((r) =>
          r.id === id && r.bar ? { ...r, bar: { ...r.bar, ...barPatch } } : r
        );
        return {
          ...prev,
          rows: cascadeShiftRows(prev, updatedRows, id),
        };
      }, true);
    },
    [updateActivePage]
  );

  const addDependency = useCallback(
    (taskId: string, predId: string, type: DepType) => {
      if (taskId === predId) return;
      updateActivePage((prev) => {
        const updatedRows = prev.rows.map((r) => {
          if (r.id !== taskId) return r;
          const existing = (r.deps || []).filter((d) => d.id !== predId);
          return { ...r, deps: [...existing, { id: predId, type }] };
        });
        return {
          ...prev,
          rows: cascadeShiftRows(prev, updatedRows, predId),
        };
      }, true);
    },
    [updateActivePage]
  );

  const removeDependency = useCallback(
    (taskId: string, predId: string) => {
      updateActivePage(
        (prev) => ({
          ...prev,
          rows: prev.rows.map((r) =>
            r.id === taskId
              ? { ...r, deps: (r.deps || []).filter((d) => d.id !== predId) }
              : r
          ),
        }),
        true
      );
    },
    [updateActivePage]
  );

  const deleteRow = useCallback(
    (id: string) => {
      updateActivePage(
        (prev) => ({
          ...prev,
          rows: prev.rows
            .filter((r) => r.id !== id)
            .map((r) =>
              r.deps?.length
                ? { ...r, deps: r.deps.filter((d) => d.id !== id) }
                : r
            ),
        }),
        true
      );
    },
    [updateActivePage]
  );

  const duplicateRow = useCallback(
    (id: string) => {
      updateActivePage((prev) => {
        const idx = prev.rows.findIndex((r) => r.id === id);
        if (idx === -1) return prev;
        const src = prev.rows[idx];
        const copy: TimelineRow = {
          ...src,
          id: `${src.type === "group" ? "grp" : "tsk"}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: `${src.name} (copy)`,
          bar: src.bar ? { ...src.bar } : undefined,
          deps: src.deps ? src.deps.map((d) => ({ ...d })) : undefined,
        };
        const next = [...prev.rows];
        next.splice(idx + 1, 0, copy);
        return { ...prev, rows: next };
      }, true);
    },
    [updateActivePage]
  );

  const addTaskAfter = useCallback(
    (afterId: string) => {
      updateActivePage((prev) => {
        const idx = prev.rows.findIndex((r) => r.id === afterId);
        const count = prev.rows.filter((r) => r.type === "task").length + 1;
        const firstMonth = prev.months[0];
        const startMonth = prev.cm || firstMonth?.name || "Januari";
        const startYear = prev.cy || firstMonth?.year || prev.year;
        const startWeek = prev.cw || 1;
        const newTask: TimelineRow = {
          id: `tsk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: "task",
          name: `Task ${count}`,
          owner: "",
          bar: {
            startMonth,
            startWeek,
            startYear,
            endMonth: startMonth,
            endWeek: startWeek,
            endYear: startYear,
            progress: 0,
            status: "notstarted",
          },
          deps: [],
        };
        const next = [...prev.rows];
        if (idx === -1) {
          next.push(newTask);
        } else {
          next.splice(idx + 1, 0, newTask);
        }
        return { ...prev, rows: next };
      }, true);
    },
    [updateActivePage]
  );

  const moveRow = useCallback(
    (id: string, dir: -1 | 1) => {
      updateActivePage((prev) => {
        const idx = prev.rows.findIndex((r) => r.id === id);
        if (idx === -1) return prev;
        const target = idx + dir;
        if (target < 0 || target >= prev.rows.length) return prev;
        const next = [...prev.rows];
        const [item] = next.splice(idx, 1);
        next.splice(target, 0, item);
        return { ...prev, rows: next };
      }, true);
    },
    [updateActivePage]
  );

  const reorderRow = useCallback(
    (fromId: string, toId: string) => {
      if (fromId === toId) return;
      updateActivePage((prev) => {
        const fromIdx = prev.rows.findIndex((r) => r.id === fromId);
        const toIdx = prev.rows.findIndex((r) => r.id === toId);
        if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return prev;
        const next = [...prev.rows];
        const [item] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, item);
        return { ...prev, rows: next };
      }, true);
    },
    [updateActivePage]
  );

  const toggleGroupCollapse = useCallback(
    (id: string) => {
      updateActivePage(
        (prev) => ({
          ...prev,
          rows: prev.rows.map((r) =>
            r.id === id && r.type === "group"
              ? { ...r, collapsed: !r.collapsed }
              : r
          ),
        }),
        false
      );
    },
    [updateActivePage]
  );

  const expandAllGroups = useCallback(() => {
    updateActivePage(
      (prev) => ({
        ...prev,
        rows: prev.rows.map((r) =>
          r.type === "group" ? { ...r, collapsed: false } : r
        ),
      }),
      false
    );
  }, [updateActivePage]);

  const collapseAllGroups = useCallback(() => {
    updateActivePage(
      (prev) => ({
        ...prev,
        rows: prev.rows.map((r) =>
          r.type === "group" ? { ...r, collapsed: true } : r
        ),
      }),
      false
    );
  }, [updateActivePage]);

  const undo = useCallback(() => {
    setPast((h) => {
      if (h.length === 0) return h;
      const previous = h[h.length - 1];
      setFuture((f) => [project, ...f.slice(0, MAX_HISTORY - 1)]);
      setProject(previous);
      return h.slice(0, -1);
    });
  }, [project]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[0];
      setPast((h) => [...h.slice(-(MAX_HISTORY - 1)), project]);
      setProject(next);
      return f.slice(1);
    });
  }, [project]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((c) => !c);
  }, []);

  const value = useMemo<TimelineContextValue>(
    () => ({
      project,
      activePage,
      cloudProjectId,
      setCloudProjectId,
      activeWorkspaceId,
      setActiveWorkspaceId,
      cloudProjectRole,
      setCloudProjectRole,
      cloudProjectVersion,
      setCloudProjectVersion,
      roomUsers,
      roomConnected,
      remoteCursors,
      reportActiveRow,
      lang,
      sidebarTab,
      sidebarCollapsed,
      saveState,
      canUndo: past.length > 0,
      canRedo: future.length > 0,
      notice,
      activeModal,
      openModal,
      closeModal,
      t,
      setLang,
      setSidebarTab,
      toggleSidebar,
      setMode,
      setZoom,
      updateActivePage,
      setActivePage,
      addPage,
      closePage,
      renamePage,
      addGroup,
      addTask,
      appendRows,
      updateRow,
      updateBarAndCascade,
      addDependency,
      removeDependency,
      deleteRow,
      duplicateRow,
      addTaskAfter,
      moveRow,
      reorderRow,
      toggleGroupCollapse,
      expandAllGroups,
      collapseAllGroups,
      resetProject,
      loadProject,
      openCloudProject,
      undo,
      redo,
      showNotice,
    }),
    [
      project,
      activePage,
      cloudProjectId,
      setCloudProjectId,
      activeWorkspaceId,
      setActiveWorkspaceId,
      cloudProjectRole,
      setCloudProjectRole,
      cloudProjectVersion,
      setCloudProjectVersion,
      roomUsers,
      roomConnected,
      remoteCursors,
      reportActiveRow,
      lang,
      sidebarTab,
      sidebarCollapsed,
      saveState,
      past.length,
      future.length,
      notice,
      activeModal,
      openModal,
      closeModal,
      t,
      setLang,
      setSidebarTab,
      toggleSidebar,
      setMode,
      setZoom,
      updateActivePage,
      setActivePage,
      addPage,
      closePage,
      renamePage,
      addGroup,
      addTask,
      appendRows,
      updateRow,
      updateBarAndCascade,
      addDependency,
      removeDependency,
      deleteRow,
      duplicateRow,
      addTaskAfter,
      moveRow,
      reorderRow,
      toggleGroupCollapse,
      expandAllGroups,
      collapseAllGroups,
      resetProject,
      loadProject,
      openCloudProject,
      undo,
      redo,
      showNotice,
    ]
  );

  return (
    <TimelineContext.Provider value={value}>
      {children}
    </TimelineContext.Provider>
  );
}

export function useTimeline(): TimelineContextValue {
  const ctx = useContext(TimelineContext);
  if (!ctx) {
    throw new Error("useTimeline must be used inside TimelineProvider");
  }
  return ctx;
}
