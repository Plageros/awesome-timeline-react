import { describe, expect, test } from "@jest/globals";
import {
  DEFAULT_FADE_DURATION_MS,
  DEFAULT_LAYOUT_DURATION_MS,
  LayoutAnimator,
} from "../src/canvas/animator";

describe("LayoutAnimator", () => {
  test("defaults are snappy", () => {
    expect(DEFAULT_LAYOUT_DURATION_MS).toBe(200);
    expect(DEFAULT_FADE_DURATION_MS).toBe(120);
  });

  test("first sighting renders at target instantly, no animation", () => {
    const animator = new LayoutAnimator();
    animator.beginFrame(1000);
    expect(animator.eventTop("e1", 40)).toBe(40);
    expect(animator.isAnimating()).toBe(false);
  });

  test("a changed target tweens over the layout duration and settles", () => {
    const animator = new LayoutAnimator();
    animator.beginFrame(1000);
    animator.eventTop("e1", 40);

    animator.beginFrame(2000);
    const atStart = animator.eventTop("e1", 84); // retarget
    expect(atStart).toBe(40); // t=0
    expect(animator.isAnimating()).toBe(true);

    animator.beginFrame(2100); // halfway through 200ms
    const mid = animator.eventTop("e1", 84);
    expect(mid).toBeGreaterThan(40);
    expect(mid).toBeLessThan(84);
    expect(mid).toBeCloseTo(62, 0); // smoothstep(0.5) = 0.5

    animator.beginFrame(2250); // past the end
    expect(animator.eventTop("e1", 84)).toBe(84);
    expect(animator.isAnimating()).toBe(false);
  });

  test("retargeting mid-tween starts from the current displayed value", () => {
    const animator = new LayoutAnimator();
    animator.beginFrame(0);
    animator.eventTop("e1", 10);
    animator.beginFrame(100);
    animator.eventTop("e1", 110); // tween 10 -> 110
    animator.beginFrame(200); // halfway: displayed = 60
    const beforeRetarget = animator.eventTop("e1", 110);
    expect(beforeRetarget).toBeCloseTo(60, 0);
    const retargeted = animator.eventTop("e1", 10); // reverse direction
    // starts back from ~60, not from 110
    expect(retargeted).toBeCloseTo(60, 0);
    animator.beginFrame(1000);
    expect(animator.eventTop("e1", 10)).toBe(10);
  });

  test("handleAlpha fades over the fade duration", () => {
    const animator = new LayoutAnimator();
    animator.beginFrame(0);
    expect(animator.handleAlpha("e1", 0)).toBe(0);
    animator.beginFrame(100);
    animator.handleAlpha("e1", 1); // hover on
    animator.beginFrame(160); // halfway through 120ms
    const mid = animator.handleAlpha("e1", 1);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    animator.beginFrame(300);
    expect(animator.handleAlpha("e1", 1)).toBe(1);
  });

  test("setDurations(0, 0) disables animation: values jump to target", () => {
    const animator = new LayoutAnimator();
    animator.setDurations(0, 0);
    animator.beginFrame(0);
    animator.eventTop("e1", 40);
    animator.handleAlpha("e1", 0);
    animator.beginFrame(10);
    expect(animator.eventTop("e1", 84)).toBe(84);
    expect(animator.handleAlpha("e1", 1)).toBe(1);
    expect(animator.isAnimating()).toBe(false);
  });

  test("custom durations are respected", () => {
    const animator = new LayoutAnimator();
    animator.setDurations(1000, 120);
    animator.beginFrame(0);
    animator.eventTop("e1", 0);
    animator.beginFrame(10);
    animator.eventTop("e1", 100);
    animator.beginFrame(510); // halfway through 1000ms
    expect(animator.eventTop("e1", 100)).toBeCloseTo(50, 0);
  });

  test("snapEventTop drops the tween so the next draw lands instantly", () => {
    const animator = new LayoutAnimator();
    animator.beginFrame(0);
    animator.eventTop("e1", 10);
    animator.beginFrame(10);
    animator.snapEventTop("e1"); // drop commit
    expect(animator.eventTop("e1", 200)).toBe(200); // fresh sighting, no tween
  });

  test("reset drops all tweens", () => {
    const animator = new LayoutAnimator();
    animator.beginFrame(0);
    animator.eventTop("e1", 40);
    animator.beginFrame(10);
    animator.eventTop("e1", 80);
    animator.reset();
    expect(animator.isAnimating()).toBe(false);
    animator.beginFrame(20);
    expect(animator.eventTop("e1", 80)).toBe(80); // fresh sighting
  });

  // Regression: switching datasets resets the scene but must also reset the
  // animator, otherwise an event caught mid-tween keeps its stale baseline and
  // the canvas draws it at the wrong position until the tween finishes — which
  // it may never do if the board is hidden.
  test("reset makes an event with a changed target render instantly", () => {
    const animator = new LayoutAnimator();
    // dataset A: event settles at lane offset 120
    animator.beginFrame(0);
    animator.eventTop("e1", 120);
    // position changes -> tween starts (default 200ms duration)
    animator.beginFrame(100);
    animator.eventTop("e1", 40);
    // mid-flight (halfway through the tween) it reads an intermediate value
    animator.beginFrame(200);
    const midTween = animator.eventTop("e1", 40);
    expect(midTween).toBeGreaterThan(40);
    expect(midTween).toBeLessThan(120);
    // dataset B swap: reset, then the new dataset's position for that event
    animator.reset();
    animator.beginFrame(250);
    // no tween from the stale 120 baseline — lands on target immediately
    expect(animator.eventTop("e1", 60)).toBe(60);
    expect(animator.isAnimating()).toBe(false);
  });
});
