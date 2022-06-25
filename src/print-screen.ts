import { Duplex } from 'stream';
import Jimp from 'jimp';
import robot from 'robotjs';
import Point from './point.js';
import { COMMAND } from './constants.js';
import { sendCommandWithLog } from './command.js';

const SIZE = 200;

function transformToJimg(img: robot.Bitmap): Jimp {
  let jimg = new Jimp(SIZE, SIZE);
  for (let x = 0; x < SIZE; x += 1) {
    for (let y = 0; y < SIZE; y += 1) {
      const hex = img.colorAt(x, y);
      const num = parseInt(hex + "ff", 16)
      jimg.setPixelColor(num, x, y);
    }
  }
  return jimg;
}

async function getPrintScreen(): Promise<string> {
  const { x, y } = new Point(robot.getMousePos());
  const halfSize = SIZE / 2;
  const screenCapture = robot.screen.capture(x - halfSize, y - halfSize, SIZE, SIZE);

  return transformToJimg(screenCapture)
    .getBase64Async(Jimp.MIME_PNG);
}

export default async function sendPrintScreen(writeStream: Duplex): Promise<void> {
  try {
    const pngBase64String: string = await getPrintScreen();
    const command = `${COMMAND.PRINT_SCREEN} ${pngBase64String.split(',')[1]}`;
    await sendCommandWithLog(command, writeStream);
  } catch (err) {
    console.error(err as Error);
  }
}