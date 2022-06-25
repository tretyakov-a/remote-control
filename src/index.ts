import { httpServer } from './http_server/index.js';
import { createWebSocketStream, WebSocketServer, WebSocket } from 'ws';
import RobotDrawer from './drawer/robot-drawer.js';
import { IDrawer } from './drawer/drawer.interface.js';
import sendPrintScreen from './print-screen.js';
import { sendPosition, moveMouse } from './positioning.js';
import { parseCommand, logInputCommand } from './command.js';
import { DIRECTION, COMMAND } from './common/constants.js';

const HTTP_PORT = 3000;
const WSS_PORT = 8080;

console.log(`Start static http server on the localhost:${HTTP_PORT}!`);
httpServer.listen(HTTP_PORT);

const wss = new WebSocketServer({ port: WSS_PORT });
console.log(`Start web socket server on the localhost:${WSS_PORT}!`);

const robotDrawer: IDrawer = new RobotDrawer();
const wsClients: WebSocket[] = [];

wss.on('connection', (ws: WebSocket) => {
  wsClients.push(ws);

  const duplexStream = createWebSocketStream(ws, { encoding: 'utf8', decodeStrings: false });
  duplexStream.setMaxListeners(0);

  duplexStream.on('error', (err) => {
    console.error(err);
    ws.close();
  });

  duplexStream.on('data', (data) => {
    logInputCommand(data);
    
    const D = DIRECTION;
    const C = COMMAND;
    const { name, param1, param2 } = parseCommand(data);
    
    switch(name) {
      case C.MOUSE_POSITION: sendPosition(duplexStream); break;
      case C.MOUSE_UP: moveMouse(param1, D.UP); break;
      case C.MOUSE_DOWN: moveMouse(param1, D.DOWN); break;
      case C.MOUSE_LEFT: moveMouse(param1, D.LEFT); break;
      case C.MOUSE_RIGHT: moveMouse(param1, D.RIGHT); break;
      case C.DRAW_CIRCLE: robotDrawer.drawCircle(param1); break;
      case C.DRAW_RECT: robotDrawer.drawRectangle(param1, param2); break;
      case C.DRAW_SQUARE: robotDrawer.drawRectangle(param1, param1); break;
      case C.PRINT_SCREEN: sendPrintScreen(duplexStream); break;
    }
  });
});

wss.on('error', (err) => {
  console.error(err);
  wsClients.forEach((ws) => ws.close());
});

wss.on('close', () => {
  wsClients.forEach((ws) => ws.close());
});
