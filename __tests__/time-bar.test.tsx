import React from "react";
import renderer from "react-test-renderer";
import TimeBar from "../src/components/time-bar";

describe("Test time bar component", () => {
  test("Check number of generated day and hour blocks", () => {
    // span of 4 days
    const windowTime = [1723125600, 1723384800];
    const windowDuration = windowTime[1] - windowTime[0];
    const component = renderer.create(
      <TimeBar
        contentWidth={1000}
        tick={windowDuration / 1000}
        scrollWidth={0}
        windowTime={windowTime}
      />
    );
    let tree = component.toJSON();
    if (!Array.isArray(tree))
      //@ts-ignore
      expect(tree?.children[1].children[0].children.length).toEqual(4);
    if (!Array.isArray(tree))
      //@ts-ignore
      expect(tree?.children[1].children[1].children.length).toEqual(72);
  });
});
