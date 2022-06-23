import { IDrawer } from "drawer.interface.js";
import Point from "./point.js";
import robot from 'robotjs';

export default class RobotDrawer implements IDrawer {
  private static step: number = 1;
  
  public drawRectangle(width: number, height: number, start: Point = new Point(robot.getMousePos())): void {
    const points: Point[] = [
      start,
      new Point(start.x + width, start.y),
      new Point(start.x + width, start.y + height),
      new Point(start.x, start.y + height),
    ];

    points.forEach((point, i) => {
      const end = points[i + 1] || start;
      this.drawLine(point, end);
    });
  }

  private withMouseDown(cb: () => void): void {
    robot.mouseToggle('down');
    cb.call(this);
    robot.mouseToggle('up');
  }

  public drawCircle(radius: number, start: Point = new Point(robot.getMousePos())): void {
    this.withMouseDown(() => {
      const twoPI = 2 * Math.PI;
      const oneDegreeInRadians = twoPI / 360; 
      const centerY = start.y + radius;

      for (let angle = 0; angle <= twoPI; angle += oneDegreeInRadians) {
        const dx = radius * Math.sin(angle);
        const dy = radius * Math.cos(angle);
        robot.moveMouse(start.x + dx, centerY - dy);
      }
    })
  }

  public drawLine(start: Point, end: Point): void {
    this.withMouseDown(() => {
      const { step } = RobotDrawer;
      let { x, y } = start;
      let len = start.getDistanceTo(end);
      const angle = Math.abs(Math.asin((end.y - y) / len));
      const dx = ((end.x - x) > 0 ? step : -step) * Math.cos(angle);
      const dy = ((end.y - y) > 0 ? step : -step) * Math.sin(angle);
      while (len - step > 0) {
        len -= step;
        x += dx;
        y += dy;
        robot.moveMouse(x, y);
      }
      robot.moveMouse(end.x, end.y);
    })
  }
}