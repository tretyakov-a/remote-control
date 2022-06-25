export default class Point {
  private _x: number;
  private _y: number;

  get x() {
    return this._x;
  }

  get y() {
    return this._y;
  }

  constructor(x: number | Point | { x: number, y: number }, y?: number) {
    if (typeof x === 'number') {
      this._x = x;
      this._y = y || 0;
    } else {
      this._x = x.x;
      this._y = x.y;
    }
  }

  public getDistanceTo(end: Point): number {
    return Math.sqrt((end.x - this.x) ** 2 + (end.y - this.y) ** 2);
  }
}
