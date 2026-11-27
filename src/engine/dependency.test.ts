import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDefaultPage } from "../constants/defaults";
import { parseISO } from "./calendar";
import { cascadeShiftRows, collectDepEdges, depBad } from "./dependency";

describe("dependency engine", () => {
  it("detects FS/SS/FF/SF dependency conflicts", () => {
    const a = {
      sd: parseISO("2026-11-10")!,
      ed: parseISO("2026-11-14")!,
      sm: "November",
      sw: 2,
      sy: 2026,
      em: "November",
      ew: 2,
      ey: 2026,
    };
    const bOverlap = { ...a, sd: parseISO("2026-11-12")!, ed: parseISO("2026-11-16")! };
    const bAfter = { ...a, sd: parseISO("2026-11-15")!, ed: parseISO("2026-11-18")! };

    assert.equal(depBad("FS", a, bOverlap), true);
    assert.equal(depBad("FS", a, bAfter), false);
    assert.equal(depBad("SS", a, bOverlap), false);
    assert.equal(depBad("FF", a, bOverlap), false);
  });

  it("cascade-shifts downstream FS tasks and preserves baseline", () => {
    const page = createDefaultPage(1, "id", "Page 1");
    page.dateMode = "day";
    page.cascade = true;
    page.wdSnap = false;
    page.workDays = [0, 1, 2, 3, 4, 5, 6];
    page.holidays = [];
    page.rows = [
      {
        id: "t1",
        type: "task",
        name: "Task 1",
        bar: { sd: "2026-11-10", ed: "2026-11-15", progress: 0, status: "notstarted" },
      },
      {
        id: "t2",
        type: "task",
        name: "Task 2",
        deps: [{ id: "t1", type: "FS" }],
        bar: {
          sd: "2026-11-12",
          ed: "2026-11-14",
          baseline: { sd: "2026-11-12", ed: "2026-11-14" },
          progress: 0,
          status: "notstarted",
        },
      },
    ];

    const edges = collectDepEdges(page);
    assert.equal(edges[0]?.conflict, true);

    const shifted = cascadeShiftRows(page, page.rows, "t1");
    const t2 = shifted.find((r) => r.id === "t2")!;
    assert.equal(t2.bar?.sd, "2026-11-16");
    assert.equal(t2.bar?.ed, "2026-11-18");
    assert.deepEqual(t2.bar?.baseline, { sd: "2026-11-12", ed: "2026-11-14" });
  });
});
