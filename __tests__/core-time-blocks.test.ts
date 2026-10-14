import { describe, expect, test } from "@jest/globals";
import {
  generateTimeBlocks,
  generateUnitBlocks,
  isoWeek,
  resolveTimeBar,
} from "../src/core/time-blocks";
import { TimeBarLevel } from "../src/types";

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

describe("generateUnitBlocks (year and boundaries units)", () => {
  test("year row labels the year and splits at 1 January", () => {
    const windowStart = new Date(2024, 10, 1).getTime() / 1000;
    const windowEnd = new Date(2025, 2, 1).getTime() / 1000;
    const blocks = generateUnitBlocks({ unit: "year", windowStart, windowEnd, tick: 3600 });
    expect(blocks.map((b) => b.label)).toEqual(["2024", "2025"]);
  });

  test("boundaries build uneven blocks, clipped to the window", () => {
    const at = (day: number, h: number) => new Date(2024, 0, day, h).getTime() / 1000;
    // Fri 5 Jan 06/14/22, then the weekend off until Mon 8 Jan 06:00
    const edges = [at(5, 6), at(5, 14), at(5, 22), at(6, 6), at(8, 6), at(8, 14)];
    const blocks = generateUnitBlocks({
      unit: { boundaries: () => edges },
      format: (s, e) => `${s.getHours()}-${e.getHours()}`,
      windowStart: at(5, 10),
      windowEnd: at(8, 10),
      tick: 3600,
    });
    expect(blocks.map((b) => b.label)).toEqual(["6-14", "14-22", "22-6", "6-6", "6-14"]);
    expect(blocks[0].x).toBe(0);
    expect(blocks[0].width).toBe(4);
    expect(blocks[3].width).toBe(48);
    expect(blocks[4].width).toBe(4);
  });
});

describe("isoWeek", () => {
  test("follows ISO-8601 across year ends", () => {
    expect(isoWeek(new Date(2024, 11, 30))).toBe(1); // Mon 30 Dec 2024 is W1 of 2025
    expect(isoWeek(new Date(2026, 0, 1))).toBe(1);
    expect(isoWeek(new Date(2027, 0, 1))).toBe(53); // Fri 1 Jan 2027 is W53 of 2026
    expect(isoWeek(new Date(2026, 9, 14))).toBe(42);
  });
});

describe("resolveTimeBar", () => {
  const width = 1400;
  const at = (days: number) => {
    const windowStart = new Date(2026, 9, 12, 0).getTime() / 1000;
    const windowEnd = windowStart + days * 86400;
    return { windowStart, windowEnd, tick: (windowEnd - windowStart) / width };
  };
  const bottomUnit = (days: number, auto: Parameters<typeof resolveTimeBar>[0]) => {
    const { windowStart, windowEnd, tick } = at(days);
    return resolveTimeBar(auto, windowStart, windowEnd, tick).bottomRow.unit;
  };

  test("without auto it is the configured rows, day over hour by default", () => {
    expect(resolveTimeBar(undefined, 0, 3600, 1)).toEqual({
      topRow: { unit: "day" },
      bottomRow: { unit: "hour" },
    });
    expect(resolveTimeBar({ bottomRow: { unit: "week" } }, 0, 3600, 1).bottomRow.unit).toBe("week");
  });

  test("auto picks the finest level whose blocks stay readable", () => {
    expect(bottomUnit(1, { auto: true })).toBe("hour"); // 58 px an hour
    expect(bottomUnit(7, { auto: true })).toEqual({ stepSeconds: 6 * 3600 }); // 50 px per 6 h
    expect(bottomUnit(30, { auto: true })).toBe("day"); // 47 px a day
    expect(bottomUnit(365, { auto: true })).toBe("month"); // a week would be 27 px
  });

  test("auto falls back to the coarsest level when nothing is wide enough", () => {
    expect(bottomUnit(3650, { auto: true })).toBe("month");
  });

  test("auto honours custom levels and minBlockWidth", () => {
    const levels: TimeBarLevel[] = [
      { topRow: { unit: "day" }, bottomRow: { unit: "hour" } },
      { topRow: { unit: "week" }, bottomRow: { unit: "day" } },
    ];
    expect(bottomUnit(1, { auto: { levels, minBlockWidth: 100 } })).toBe("day");
    expect(bottomUnit(1, { auto: { levels, minBlockWidth: 50 } })).toBe("hour");
  });

  test("an uneven level is judged by its narrowest block", () => {
    const { windowStart, windowEnd, tick } = at(7);
    const shifts = (step: number): TimeBarLevel => ({
      topRow: { unit: "day" },
      bottomRow: {
        unit: {
          boundaries: (s, e) => {
            const edges: number[] = [];
            for (let t = s - (s % 3600); t <= e + step; t += step) edges.push(t);
            return edges;
          },
        },
      },
    });
    const coarse = shifts(8 * 3600); // 67 px
    const fine = shifts(3600); // 8 px
    expect(resolveTimeBar({ auto: { levels: [fine, coarse] } }, windowStart, windowEnd, tick)).toBe(coarse);
  });

  test("an unmeasured timeline gets the first level", () => {
    expect(resolveTimeBar({ auto: true }, 0, 3600, null).bottomRow.unit).toBe("hour");
  });
});
