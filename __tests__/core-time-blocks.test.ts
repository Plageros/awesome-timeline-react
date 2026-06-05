import { describe, expect, test } from "@jest/globals";
import { generateTimeBlocks } from "../src/core/time-blocks";

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
