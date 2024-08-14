import React from "react";
import renderer from "react-test-renderer";
import LinesCanvas from "../src/components/lines-canvas";

describe("Test lines canvas component", () => {
  test("Check number of generated lines", () => {
    const component = renderer.create(
      <LinesCanvas cellWidth={10} contentWidth={1000} />
    );
    let tree = component.toJSON();
    if (!Array.isArray(tree)) expect(tree?.children?.length).toEqual(99);
  });

  test("Check proper class names", () => {
    const component = renderer.create(
      <LinesCanvas cellWidth={10} contentWidth={990.5} />
    );
    let tree = component.toJSON();
    if (!Array.isArray(tree))
      expect(tree?.props.className).toBe("lines-canvas hide-last-line");
  });
});
