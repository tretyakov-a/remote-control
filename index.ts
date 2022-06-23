import Jimp from 'jimp';
import { httpServer } from './src/http_server/index.js';
import robot from 'robotjs';
import { WebSocketServer, WebSocket } from 'ws';
import RobotDrawer from './src/robot-drawer.js';
import { IDrawer } from './src/drawer.interface.js';
import Point from './src/point.js';

const HTTP_PORT = 3000;

enum DIRECTION {
  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right',
}

console.log(`Start static http server on the ${HTTP_PORT} port!`);
httpServer.listen(HTTP_PORT);

const wss = new WebSocketServer({ port: 8080 });
const robotDrawer: IDrawer = new RobotDrawer();

function sendPosition(ws: WebSocket): void {
  const { x, y } = new Point(robot.getMousePos());
  ws.send(`mouse_position ${x},${y}`);
}

function moveMouse(distance: number = 0, direction: DIRECTION): void {
  const { x, y } = new Point(robot.getMousePos());
  const D = DIRECTION;
  switch(direction) {
    case D.UP: robot.moveMouse(x, y - distance); break;
    case D.DOWN: robot.moveMouse(x, y + distance); break;
    case D.LEFT: robot.moveMouse(x - distance, y); break;
    case D.RIGHT: robot.moveMouse(x + distance, y); break;
  }
}

function sendPrintScreen(ws: WebSocket) {
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

  jimg.getBase64Async(Jimp.MIME_PNG)
    .then((buffer) => {
      ws.send(`prnt_scrn ${buffer.toString().split(',')[1]}`);
    })
}

type Command = {
  name: string,
  param1?: number,
  param2?: number,
};

const parseCommand = (str: string): Command => {
  let [ name, param1str, param2str ] = str.split(' ');

  const param1 = Number(param1str) || undefined;
  const param2 = Number(param2str) || undefined;
  return {
    name, param1, param2,
  }
}

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    console.log('received: %s', data);

    const D = DIRECTION;
    const { name, param1, param2 } = parseCommand(data.toString());

    switch(name) {
      case 'mouse_position': sendPosition(ws); break;
      case 'mouse_up': moveMouse(param1, D.UP); break;
      case 'mouse_down': moveMouse(param1, D.DOWN); break;
      case 'mouse_left': moveMouse(param1, D.LEFT); break;
      case 'mouse_right': moveMouse(param1, D.RIGHT); break;
      case 'draw_circle': robotDrawer.drawCircle(param1); break;
      case 'draw_rectangle': robotDrawer.drawRectangle(param1, param2); break;
      case 'draw_square': robotDrawer.drawRectangle(param1, param1); break;
      case 'prnt_scrn': sendPrintScreen(ws); break;
    }

  });

  ws.send('ready');
});
