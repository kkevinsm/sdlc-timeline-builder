import type { PageData, ProjectData, TimelineRow } from "@/types/timeline";

export type TimelineOp =
  | {
      kind: "row_upsert";
      pageId: number;
      row: TimelineRow;
      afterId?: string | null;
    }
  | {
      kind: "row_delete";
      pageId: number;
      rowId: string;
    }
  | {
      kind: "row_reorder";
      pageId: number;
      order: string[];
    }
  | {
      kind: "page_patch";
      pageId: number;
      patch: Partial<Omit<PageData, "id" | "rows">>;
    }
  | {
      kind: "project_replace";
      project: ProjectData;
    };

/**
 * Compute minimal granular operations between two ProjectData snapshots.
 * Used both for low-latency WebSocket op broadcasting and 3-way conflict merging.
 */
export function diffProjectOps(
  prev: ProjectData,
  next: ProjectData
): TimelineOp[] {
  if (prev === next) return [];

  if (
    prev.pages.length !== next.pages.length ||
    prev.pages.some((p, i) => p.id !== next.pages[i]?.id)
  ) {
    return [{ kind: "project_replace", project: next }];
  }

  const ops: TimelineOp[] = [];

  for (let i = 0; i < next.pages.length; i++) {
    const pPrev = prev.pages[i];
    const pNext = next.pages[i];
    if (pPrev === pNext) continue;

    // 1. Diff non-row page properties
    const pagePatch: Partial<Omit<PageData, "id" | "rows">> = {};
    let hasPagePatch = false;
    for (const key of Object.keys(pNext) as Array<keyof PageData>) {
      if (key === "id" || key === "rows") continue;
      if (JSON.stringify(pPrev[key]) !== JSON.stringify(pNext[key])) {
        (pagePatch as Record<string, unknown>)[key] = pNext[key];
        hasPagePatch = true;
      }
    }
    if (hasPagePatch) {
      ops.push({ kind: "page_patch", pageId: pNext.id, patch: pagePatch });
    }

    // 2. Diff rows by ID
    if (pPrev.rows !== pNext.rows) {
      const prevMap = new Map(pPrev.rows.map((r) => [r.id, r]));
      const nextMap = new Map(pNext.rows.map((r) => [r.id, r]));

      for (const r of pPrev.rows) {
        if (!nextMap.has(r.id)) {
          ops.push({ kind: "row_delete", pageId: pNext.id, rowId: r.id });
        }
      }

      for (let idx = 0; idx < pNext.rows.length; idx++) {
        const rNext = pNext.rows[idx];
        const rPrev = prevMap.get(rNext.id);
        if (!rPrev || JSON.stringify(rPrev) !== JSON.stringify(rNext)) {
          const afterId = idx > 0 ? pNext.rows[idx - 1].id : null;
          ops.push({
            kind: "row_upsert",
            pageId: pNext.id,
            row: rNext,
            afterId: rPrev ? undefined : afterId,
          });
        }
      }

      // Check if existing row relative order changed
      const prevSurviving = pPrev.rows
        .filter((r) => nextMap.has(r.id))
        .map((r) => r.id);
      const nextExisting = pNext.rows
        .filter((r) => prevMap.has(r.id))
        .map((r) => r.id);
      if (
        prevSurviving.length === nextExisting.length &&
        prevSurviving.some((id, idx) => id !== nextExisting[idx])
      ) {
        ops.push({
          kind: "row_reorder",
          pageId: pNext.id,
          order: pNext.rows.map((r) => r.id),
        });
      }
    }
  }

  return ops;
}

/**
 * Apply granular TimelineOps onto a base ProjectData without clobbering
 * unrelated rows or pages modified concurrently by another user.
 */
export function applyTimelineOps(
  base: ProjectData,
  ops: TimelineOp[]
): ProjectData {
  if (ops.length === 0) return base;

  let current = base;
  for (const op of ops) {
    if (op.kind === "project_replace") {
      current = op.project;
      continue;
    }

    current = {
      ...current,
      pages: current.pages.map((page) => {
        if (page.id !== op.pageId) return page;

        if (op.kind === "page_patch") {
          return { ...page, ...op.patch };
        }

        if (op.kind === "row_delete") {
          return {
            ...page,
            rows: page.rows
              .filter((r) => r.id !== op.rowId)
              .map((r) =>
                r.deps?.length
                  ? { ...r, deps: r.deps.filter((d) => d.id !== op.rowId) }
                  : r
              ),
          };
        }

        if (op.kind === "row_upsert") {
          const exists = page.rows.some((r) => r.id === op.row.id);
          if (exists) {
            return {
              ...page,
              rows: page.rows.map((r) => (r.id === op.row.id ? op.row : r)),
            };
          }
          const nextRows = [...page.rows];
          if (op.afterId === null) {
            nextRows.unshift(op.row);
          } else if (op.afterId) {
            const idx = nextRows.findIndex((r) => r.id === op.afterId);
            if (idx >= 0) {
              nextRows.splice(idx + 1, 0, op.row);
            } else {
              nextRows.push(op.row);
            }
          } else {
            nextRows.push(op.row);
          }
          return { ...page, rows: nextRows };
        }

        if (op.kind === "row_reorder") {
          const byId = new Map(page.rows.map((r) => [r.id, r]));
          const ordered: TimelineRow[] = [];
          for (const id of op.order) {
            const row = byId.get(id);
            if (row) {
              ordered.push(row);
              byId.delete(id);
            }
          }
          for (const leftover of byId.values()) {
            ordered.push(leftover);
          }
          return { ...page, rows: ordered };
        }

        return page;
      }),
    };
  }

  return current;
}
