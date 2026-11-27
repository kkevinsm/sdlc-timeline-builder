import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addDays,
  addHK,
  countHK,
  fmtISO,
  makeCalendarContext,
  parseISO,
} from "./calendar";
import { createDefaultPage } from "../constants/defaults";

describe("calendar engine", () => {
  it("parses and formats valid ISO dates", () => {
    const dt = parseISO("2026-11-27");
    assert.ok(dt);
    assert.equal(fmtISO(dt), "2026-11-27");
    assert.equal(parseISO("2026-02-30"), null);
    assert.equal(parseISO("not-a-date"), null);
  });

  it("counts and adds working days skipping weekends and holidays", () => {
    const page = createDefaultPage(1, "id", "Page 1");
    page.workDays = [1, 2, 3, 4, 5]; // Mon-Fri
    page.holidays = [{ id: "h1", date: "2026-11-25", name: "Libur" }];
    const ctx = makeCalendarContext(page);

    // 2026-11-23 (Mon) to 2026-11-27 (Fri): Mon, Tue, [Wed holiday], Thu, Fri = 4 HK
    const start = parseISO("2026-11-23")!;
    const end = parseISO("2026-11-27")!;
    assert.equal(countHK(ctx, start, end), 4);

    // Adding 4 HK starting Monday Nov 23 lands on Friday Nov 27
    assert.equal(fmtISO(addHK(ctx, start, 4)), "2026-11-27");
    assert.equal(fmtISO(addDays(start, 2)), "2026-11-25");
  });
});
