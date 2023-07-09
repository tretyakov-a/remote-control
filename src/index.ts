import { httpServer } from "./http_server/index.js";
import { createWebSocketStream, WebSocketServer, WebSocket } from "ws";
import {
  parseCommand,
  logInputCommand,
  sendCommandWithLog,
  RegCommandRequest,
  RegCommandResponse,
  AddUserToRoomCommandRequest,
} from "./command.js";
import { COMMAND } from "./constants.js";
import { Duplex } from "stream";

const HTTP_PORT = 8181;
const WSS_PORT = 3000;

console.log(`Start static http server on the localhost:${HTTP_PORT}!`);
httpServer.listen(HTTP_PORT);

const wss = new WebSocketServer({ port: WSS_PORT });
console.log(`Start web socket server on the localhost:${WSS_PORT}!`);

interface Player {
  name: string;
  password: string;
  stream: Duplex | null;
  wsIndex: number | null;
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

interface Game {
  firstPlayerIndex: number;
  secondPlayerIndex: number;
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
let rooms: Room[] = [];
const games: Game[] = [];

type Message = [COMMAND, unknown];

const onePlayerRoomsMessage = (): Message => {
  return [
    COMMAND.UPDATE_ROOM,
    rooms.filter(({ roomUsers }) => roomUsers.length === 1),
  ];
};

const sendToAll = async (messages: Message[]) => {
  for (const { stream } of players) {
    if (stream === null) continue;
    for (const [cmd, data] of messages) {
      await sendCommandWithLog(stream)(cmd, data);
    }
  }
};

const dispatchCommand =
  (duplexStream: Duplex, wsIndex: number) => async (commandData: string) => {
    logInputCommand(commandData);
    const { type, data } = parseCommand(commandData);
    let playerIdx: number;

    switch (type) {
      case COMMAND.REG:
        const { name, password } = data as RegCommandRequest;
        const msgData: RegCommandResponse = {
          name,
          index: players.findIndex((p) => p.name === name),
          error: false,
          errorText: "",
        };
        playerIdx = msgData.index;
        if (playerIdx === -1) {
          msgData.index = players.length;
          players.push({ name, password, stream: duplexStream, wsIndex });
        } else {
          if (players[playerIdx].password !== password) {
            return await sendCommandWithLog(duplexStream)(type, {
              ...msgData,
              error: true,
              errorText: `Wrong password`,
            });
          }
          if (players[playerIdx].stream !== null) {
            return await sendCommandWithLog(duplexStream)(type, {
              ...msgData,
              error: true,
              errorText: `Player ${name} already logged in`,
            });
          }
          players[playerIdx].stream = duplexStream;
          players[playerIdx].wsIndex = wsIndex;
        }
        await sendCommandWithLog(duplexStream)(type, msgData);
        await sendToAll([
          [COMMAND.UPDATE_WINNERS, winners],
          onePlayerRoomsMessage(),
        ]);
        break;
      case COMMAND.CREATE_ROOM:
        playerIdx = players.findIndex((p) => p.wsIndex === wsIndex);
        if (playerIdx === -1) return;
        const roomId = rooms.length;
        rooms.push({
          roomId,
          roomUsers: [
            {
              index: playerIdx,
              name: players[playerIdx].name,
            },
          ],
        });
        await sendToAll([onePlayerRoomsMessage()]);
        break;
      case COMMAND.ADD_USER_TO_ROOM:
        const { indexRoom } = data as AddUserToRoomCommandRequest;
        const secondPlayerIndex = players.findIndex(
          (p) => p.wsIndex === wsIndex
        );
        if (secondPlayerIndex === -1) return;
        const room = rooms.find(({ roomId }) => roomId === indexRoom);
        if (!room) return;
        const firstPlayerIndex = room.roomUsers[0].index;
        if (firstPlayerIndex === secondPlayerIndex) return;
        const idGame = games.length;
        games.push({
          firstPlayerIndex,
          secondPlayerIndex,
        });
        const sendCreateGameCommand = (idPlayer: number) =>
          sendCommandWithLog(players[idPlayer].stream)(COMMAND.CREATE_GAME, {
            idGame,
            idPlayer,
          });
        await sendCreateGameCommand(firstPlayerIndex);
        await sendCreateGameCommand(secondPlayerIndex);
        rooms = rooms.filter(({ roomId }) => roomId !== indexRoom);
        await sendToAll([onePlayerRoomsMessage()]);
    }
  };

wss.on("connection", (ws: WebSocket) => {
  const wsIndex = wsClients.size + 1;
  wsClients.set(wsIndex, ws);

  const duplexStream = createWebSocketStream(ws, {
    encoding: "utf8",
    decodeStrings: false,
  });
  duplexStream.setMaxListeners(0);

  const handleDestroy = () => {
    ws.close();
    wsClients.delete(wsIndex);
    const playerIdx = players.findIndex((p) => p.wsIndex === wsIndex);
    if (playerIdx !== -1) {
      players[playerIdx].wsIndex = null;
      players[playerIdx].stream = null;
      rooms = rooms.filter((room) => room.roomUsers[0].index !== playerIdx);
      sendToAll([onePlayerRoomsMessage()]);
    }
    console.log(`Web socket ${wsIndex} has been destroyed`);
  };

  duplexStream.on("error", (err) => {
    console.error(err);
    handleDestroy();
  });

  duplexStream.on("data", dispatchCommand(duplexStream, wsIndex));

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
