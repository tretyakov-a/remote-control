import Point from "./point.js";

export interface IDrawer {
  drawRectangle(width: number | undefined, height: number | undefined, start?: Point): void,
  drawCircle(radius: number | undefined, start?: Point): void,
  drawLine(start: Point, end: Point): void,
}
