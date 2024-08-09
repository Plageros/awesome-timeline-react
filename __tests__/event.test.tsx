import React from "react";
import renderer from "react-test-renderer";
import Event from "../src/components/event";

describe("Test event component", () => {
  test("Check props propagation", () => {
    const component = renderer.create(
      <Event
        id="1"
        startPosition={0}
        top={0}
        width={100}
        props={{
          classNames: ["test-class", "another-test-class"],
          isLocked: true,
          content: "some content",
        }}
      />
    );
    let tree = component.toJSON();
    expect(tree).toMatchSnapshot();
    expect(tree.props.className).toBe("event test-class another-test-class");
    expect(tree.props.draggable).toBeFalsy();
    expect(tree.children[0].children[0]).toBe("some content");
  });
});
