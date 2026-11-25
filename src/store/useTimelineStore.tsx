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
import { createDefaultPage, createDefaultProject } from "@/constants/defaults";
import { translate, type I18nKey } from "@/constants/i18n";
import { LANG_STORAGE_KEY, LS_STORAGE_KEY } from "@/constants/theme";
import { cascadeShiftRows } from "@/engine/dependency";
import {
  authClient,
  listCloudProjects,
  loadCloudProject,
  saveCloudProject,
} from "@/lib/authClient";
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

export type ModalKind = "paste" | "plan" | "export" | "present" | "help" | "auth" | "cloud" | null;

interface TimelineContextValue {
  project: ProjectData;
  activePage: PageData;
  cloudProjectId: string | null;
  setCloudProjectId: (id: string | null) => void;
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
  moveRow: (id: string, dir: -1 | 1) => void;
  toggleGroupCollapse: (id: string) => void;
  expandAllGroups: () => void;
  collapseAllGroups: () => void;
  resetProject: () => void;
  loadProject: (data: ProjectData) => void;
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
  const [hydratedForUser, setHydratedForUser] = useState<string | null>(null);

  const openModal = useCallback((m: Exclude<ModalKind, null>) => setActiveModal(m), []);
  const closeModal = useCallback(() => setActiveModal(null), []);

  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    const loadUserWorkspace = async () => {
      setPast([]);
      setFuture([]);

      if (!userId) {
        setProject(createDefaultProject(lang));
        setCloudProjectId(null);
        setHydratedForUser(null);
        return;
      }

      try {
        const savedCid = localStorage.getItem(userCloudIdKey(userId));
        const raw = localStorage.getItem(userProjKey(userId));
        if (raw) {
          const parsed = JSON.parse(raw) as ProjectData;
          if (parsed && Array.isArray(parsed.pages) && parsed.pages.length > 0) {
            if (!cancelled) {
              setProject(parsed);
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
            setProject(latest.data);
            setCloudProjectId(latest.id);
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
      if (cloudProjectId) {
        try {
          await saveCloudProject(cloudProjectId, project);
        } catch {
          // Keep local draft safe if offline/expired
        }
      }
      setSaveState("saved");
    }, 350);
    return () => clearTimeout(timer);
  }, [project, userId, hydratedForUser, cloudProjectId]);

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
      moveRow,
      toggleGroupCollapse,
      expandAllGroups,
      collapseAllGroups,
      resetProject,
      loadProject,
      undo,
      redo,
      showNotice,
    }),
    [
      project,
      activePage,
      cloudProjectId,
      setCloudProjectId,
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
      moveRow,
      toggleGroupCollapse,
      expandAllGroups,
      collapseAllGroups,
      resetProject,
      loadProject,
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
