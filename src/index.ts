import { httpServer } from "./http_server/index.js";
import { createWebSocketStream, WebSocketServer, WebSocket } from "ws";
import {
  parseCommand,
  logInputCommand,
  sendCommandWithLog,
  RegCommandRequest,
} from "./command.js";
import { COMMAND } from "./constants.js";
import internal from "stream";

const HTTP_PORT = 8181;
const WSS_PORT = 3000;

console.log(`Start static http server on the localhost:${HTTP_PORT}!`);
httpServer.listen(HTTP_PORT);

const wss = new WebSocketServer({ port: WSS_PORT });
console.log(`Start web socket server on the localhost:${WSS_PORT}!`);

interface Player {
  name: string;
  password: string;
}

interface Winner {
  name: string;
  wins: number;
}

interface RoomUser {
  name: string;
  index: number;
}

interface Room {
  roomId: number;
  roomUsers: RoomUser[];
}

const wsClients: Map<number, WebSocket> = new Map();
const players: Player[] = [];
const winners: Winner[] = [
  {
    name: "ValeraTheSlayer",
    wins: 100,
  },
  {
    name: "Vitek",
    wins: 1,
  },
];
const rooms: Room[] = [
  {
    roomId: 0,
    roomUsers: [
      {
        name: "ValeraTheSlayer",
        index: 0,
      },
    ],
  },
  {
    roomId: 1,
    roomUsers: [
      {
        name: "Vitek",
        index: 1,
      },
      {
        name: "Slavik",
        index: 2,
      },
    ],
  },
];

const dispatchCommand =
  (duplexStream: internal.Duplex) => async (commandData: string) => {
    logInputCommand(commandData);
    const sendCommand = sendCommandWithLog(duplexStream);
    const { type, data } = parseCommand(commandData);

    switch (type) {
      case COMMAND.REG:
        const { name, password } = data as RegCommandRequest;
        let playerIdx = players.findIndex(
          (p) => p.name === name && p.password === password
        );
        if (playerIdx === -1) {
          playerIdx = players.length;
          players.push({ name, password });
        }
        await sendCommand(type, {
          name,
          index: playerIdx,
          error: false,
          errorText: "",
        });
        await sendCommand(COMMAND.UPDATE_WINNERS, winners);
        await sendCommand(
          COMMAND.UPDATE_ROOM,
          rooms.filter(({ roomUsers }) => roomUsers.length === 1)
        );
        break;
    }
  };

wss.on("connection", (ws: WebSocket) => {
  const wsIdx = wsClients.size + 1;
  wsClients.set(wsIdx, ws);

  const duplexStream = createWebSocketStream(ws, {
    encoding: "utf8",
    decodeStrings: false,
  });
  duplexStream.setMaxListeners(0);

  const handleDestroy = () => {
    ws.close();
    wsClients.delete(wsIdx);
    console.log(`Web socket ${wsIdx} has been destroyed`);
    console.log(wsClients);
  };

  duplexStream.on("error", (err) => {
    console.error(err);
    handleDestroy();
  });

  duplexStream.on("data", dispatchCommand(duplexStream));

  ws.on("close", () => {
    console.log("Web socket was closed by client");
    handleDestroy();
  });
});

wss.on("error", (err) => {
  console.error(err);
  wsClients.forEach((ws) => ws.close());
});

wss.on("close", () => {
  wsClients.forEach((ws) => ws.close());
});
