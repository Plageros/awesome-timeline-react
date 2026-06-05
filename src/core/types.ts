export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const rectContains = (rect: Rect, x: number, y: number) =>
  x >= rect.x &&
  x <= rect.x + rect.width &&
  y >= rect.y &&
  y <= rect.y + rect.height;
