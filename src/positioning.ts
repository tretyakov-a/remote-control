import { Duplex } from 'stream';
import robot from 'robotjs';
import Point from './point.js';
import { DIRECTION, COMMAND } from './constants.js';

export function sendPosition(writeStream: Duplex): void {
  const { x, y } = new Point(robot.getMousePos());
  writeStream.write(`${COMMAND.MOUSE_POSITION} ${x},${y}`);
}

export function moveMouse(distance: number = 0, direction: DIRECTION): void {
  const { x, y } = new Point(robot.getMousePos());
  const D = DIRECTION;
  switch(direction) {
    case D.UP: robot.moveMouse(x, y - distance); break;
    case D.DOWN: robot.moveMouse(x, y + distance); break;
    case D.LEFT: robot.moveMouse(x - distance, y); break;
    case D.RIGHT: robot.moveMouse(x + distance, y); break;
  }
}
