import { describe, expect, test } from "@jest/globals";
import {
  generateTimeBlocks,
  generateUnitBlocks,
} from "../src/core/time-blocks";

describe("generateTimeBlocks", () => {
  // Mirrors __tests__/time-bar.test.tsx: same 4-day window must yield the
  // same block counts as the DOM time bar renders.
  test("4-day window produces 4 day blocks and 72 hour blocks", () => {
    const windowTime = [1723125600, 1723384800]; // 72h span
    const windowDuration = windowTime[1] - windowTime[0];
    const contentWidth = 1000;
    const tick = windowDuration / contentWidth;
    const blockWidth = contentWidth / (windowDuration / 3600);

    const { dayBlocks, hourBlocks } = generateTimeBlocks({
      windowStart: windowTime[0],
      tick,
      contentWidth,
      blockWidth,
    });

    expect(dayBlocks).toHaveLength(4);
    expect(hourBlocks).toHaveLength(72);
  });

  test("blocks tile the content width contiguously", () => {
    const windowTime = [1723125600, 1723384800];
    const windowDuration = windowTime[1] - windowTime[0];
    const contentWidth = 1000;
    const tick = windowDuration / contentWidth;
    const blockWidth = contentWidth / (windowDuration / 3600);

    const { dayBlocks, hourBlocks } = generateTimeBlocks({
      windowStart: windowTime[0],
      tick,
      contentWidth,
      blockWidth,
    });

    hourBlocks.forEach((block, i) => {
      expect(block.x).toBeCloseTo(i * blockWidth, 6);
      expect(block.width).toBeCloseTo(blockWidth, 6);
    });
    for (let i = 1; i < dayBlocks.length; i++) {
      expect(dayBlocks[i].x).toBeCloseTo(
        dayBlocks[i - 1].x + dayBlocks[i - 1].width,
        6
      );
    }
    const last = dayBlocks[dayBlocks.length - 1];
    expect(last.x + last.width).toBeCloseTo(contentWidth, 0);
  });

  test("hour labels are zero-padded HH:00", () => {
    const windowTime = [1723125600, 1723384800];
    const windowDuration = windowTime[1] - windowTime[0];
    const contentWidth = 1000;
    const { hourBlocks } = generateTimeBlocks({
      windowStart: windowTime[0],
      tick: windowDuration / contentWidth,
      contentWidth,
      blockWidth: contentWidth / (windowDuration / 3600),
    });
    expect(hourBlocks.every((b) => /^\d{2}:00$/.test(b.label))).toBe(true);
  });

  // Regression: a sub-day window (smaller than 24h) always lands in the
  // truncated-day branch. Hour labels must reflect the actual local hour at
  // windowStart, not a 0-based index — otherwise panning within a day keeps
  // printing 00:00, 01:00, … and then jumps a full day near midnight.
  test("sub-day window labels hours from the actual start hour (not from 00:00)", () => {
    const start = new Date(2024, 4, 27, 2, 0, 0); // local 02:00
    const windowStart = start.getTime() / 1000;
    const duration = 5 * 3600; // 5h window
    const contentWidth = 1000;
    const { hourBlocks, dayBlocks } = generateTimeBlocks({
      windowStart,
      tick: duration / contentWidth,
      contentWidth,
      blockWidth: contentWidth / (duration / 3600),
    });

    expect(hourBlocks.map((b) => b.label)).toEqual([
      "02:00",
      "03:00",
      "04:00",
      "05:00",
      "06:00",
    ]);
    expect(dayBlocks).toHaveLength(1);
  });

  test("panning a sub-day window shifts the labels (no freeze)", () => {
    const contentWidth = 1000;
    const duration = 5 * 3600;
    const blocks = (windowStart: number) =>
      generateTimeBlocks({
        windowStart,
        tick: duration / contentWidth,
        contentWidth,
        blockWidth: contentWidth / (duration / 3600),
      }).hourBlocks.map((b) => b.label);

    const at8 = blocks(new Date(2024, 4, 27, 8, 0, 0).getTime() / 1000);
    const at13 = blocks(new Date(2024, 4, 27, 13, 0, 0).getTime() / 1000);
    expect(at8[0]).toBe("08:00");
    expect(at13[0]).toBe("13:00");
    expect(at8).not.toEqual(at13); // labels actually move when you pan
  });

  test("returns empty when unmeasured (tick or width null)", () => {
    expect(
      generateTimeBlocks({
        windowStart: 0,
        tick: null,
        contentWidth: 1000,
        blockWidth: 10,
      })
    ).toEqual({ dayBlocks: [], hourBlocks: [] });
    expect(
      generateTimeBlocks({
        windowStart: 0,
        tick: 1,
        contentWidth: null,
        blockWidth: 10,
      })
    ).toEqual({ dayBlocks: [], hourBlocks: [] });
  });
});

describe("generateUnitBlocks (configurable rows)", () => {
  // Build a window of `hours` starting at the given local wall-clock time and
  // run the generator at 1px == 60s (so 1h == 60px).
  const run = (
    start: Date,
    hours: number,
    cfg: Parameters<typeof generateUnitBlocks>[0] extends infer T
      ? Omit<T, "windowStart" | "windowEnd" | "tick">
      : never
  ) => {
    const windowStart = start.getTime() / 1000;
    const windowEnd = windowStart + hours * 3600;
    const tick = 60; // seconds per pixel
    return generateUnitBlocks({ ...cfg, windowStart, windowEnd, tick });
  };

  test("blocks tile contiguously from x=0 to the window width", () => {
    const blocks = run(new Date(2024, 0, 1, 2, 30, 0), 6, { unit: "hour" });
    expect(blocks[0].x).toBeCloseTo(0, 6);
    for (let i = 1; i < blocks.length; i++) {
      expect(blocks[i].x).toBeCloseTo(blocks[i - 1].x + blocks[i - 1].width, 6);
    }
    const last = blocks[blocks.length - 1];
    expect(last.x + last.width).toBeCloseTo((6 * 3600) / 60, 6); // window width px
  });

  test("hour row: first block is partial, labeled by its real hour", () => {
    const blocks = run(new Date(2024, 0, 1, 2, 30, 0), 6, { unit: "hour" });
    expect(blocks[0].label).toBe("02:00"); // contains 02:30
    expect(blocks[0].width).toBeCloseTo((30 * 60) / 60, 6); // 30 min -> 30px
    expect(blocks[1].label).toBe("03:00");
  });

  test("day row over a multi-day span counts each calendar day", () => {
    // 02:00 Jan 1 .. +48h -> Jan1 (partial), Jan2 (full), Jan3 (partial)
    const blocks = run(new Date(2024, 0, 1, 2, 0, 0), 48, { unit: "day" });
    // Jan 1 2024 is a Monday
    expect(blocks.map((b) => b.label)).toEqual([
      "Mon 1 Jan",
      "Tue 2 Jan",
      "Wed 3 Jan",
    ]);
  });

  test("week row starts blocks on Monday and crosses a month boundary", () => {
    // Wed 30 Oct 2024 .. +14 days spans the Oct/Nov boundary
    const blocks = run(new Date(2024, 9, 30, 0, 0, 0), 24 * 14, {
      unit: "week",
    });
    // first visible week contains Mon 28 Oct; then Mon 4 Nov, Mon 11 Nov
    expect(blocks[0].label).toBe("Mon 28 Oct");
    expect(blocks[1].label).toBe("Mon 4 Nov");
    expect(blocks.length).toBeGreaterThanOrEqual(3);
  });

  test("month row labels month + year across a year boundary", () => {
    const blocks = run(new Date(2024, 11, 15, 0, 0, 0), 24 * 40, {
      unit: "month",
    });
    expect(blocks[0].label).toBe("Dec 2024");
    expect(blocks[1].label).toBe("Jan 2025");
  });

  test("custom stepSeconds builds fixed shift blocks anchored to midnight", () => {
    const blocks = run(new Date(2024, 0, 1, 0, 0, 0), 24, {
      unit: { stepSeconds: 8 * 3600 },
      format: (s) => `Shift ${Math.floor(s.getHours() / 8) + 1}`,
    });
    expect(blocks.map((b) => b.label)).toEqual(["Shift 1", "Shift 2", "Shift 3"]);
    expect(blocks[0].width).toBeCloseTo((8 * 3600) / 60, 6);
  });

  test("returns empty when tick is unmeasured", () => {
    expect(
      generateUnitBlocks({
        unit: "hour",
        windowStart: 0,
        windowEnd: 3600,
        tick: null,
      })
    ).toEqual([]);
  });
});
