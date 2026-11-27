import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDefaultPage } from "../constants/defaults";
import { autoStat, effStat } from "./status";

describe("status engine", () => {
  it("computes auto-status from progress vs today date", () => {
    const page = createDefaultPage(1, "id", "Page 1");
    page.dateMode = "day";
    page.autoStatus = true;
    page.atRiskThreshold = 15;
    page.today = "2026-11-15";

    assert.equal(
      autoStat(page, { sd: "2026-11-10", ed: "2026-11-20", progress: 100, status: "inprogress" }),
      "done"
    );
    assert.equal(
      autoStat(page, { sd: "2026-11-20", ed: "2026-11-25", progress: 0, status: "notstarted" }),
      "notstarted"
    );
    assert.equal(
      autoStat(page, { sd: "2026-11-01", ed: "2026-11-10", progress: 60, status: "inprogress" }),
      "atrisk"
    );
  });

  it("respects statusLocked and falls back to manual status", () => {
    const page = createDefaultPage(1, "id", "Page 1");
    page.dateMode = "day";
    page.autoStatus = true;
    page.today = "2026-11-25";

    const lockedBar = {
      sd: "2026-11-01",
      ed: "2026-11-10",
      progress: 50,
      status: "inprogress" as const,
      statusLocked: true,
    };
    assert.equal(autoStat(page, lockedBar), null);
    assert.equal(effStat(page, lockedBar), "inprogress");
  });
});
