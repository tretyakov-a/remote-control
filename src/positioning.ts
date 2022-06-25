import { Duplex } from 'stream';
import robot from 'robotjs';
import Point from './drawer/point.js';
import { DIRECTION, COMMAND } from './common/constants.js';
import { sendCommandWithLog } from './command.js';

export async function sendPosition(writeStream: Duplex): Promise<void> {
  const { x, y } = new Point(robot.getMousePos());
  const command = `${COMMAND.MOUSE_POSITION} ${x},${y}`;
  await sendCommandWithLog(command, writeStream);
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
