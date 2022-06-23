import Jimp from 'jimp';
import robot from 'robotjs';
import Point from './point.js';
import { WebSocket } from 'ws';
import { COMMAND } from './constants.js';

export default async function sendPrintScreen(ws: WebSocket) {
  const { x, y } = new Point(robot.getMousePos());
  const size = 200;
  const halfSize = size / 2;
  const img = robot.screen.capture(x - halfSize, y - halfSize, size, size);

  let jimg = new Jimp(size, size);
  for (let x = 0; x < size; x += 1) {
    for (let y = 0; y < size; y += 1) {
      const hex = img.colorAt(x, y);
      const num = parseInt(hex + "ff", 16)
      jimg.setPixelColor(num, x, y);
    }
  }
  
  try {
    const pngBase64String: string = await jimg.getBase64Async(Jimp.MIME_PNG);
    ws.send(`${COMMAND.PRINT_SCREEN} ${pngBase64String.split(',')[1]}`);
  } catch (err) {
    console.error(err as Error);
  }
}