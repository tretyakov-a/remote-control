import { httpServer } from "./http_server/index.js";
import { createWebSocketStream, WebSocketServer, WebSocket } from "ws";
import {
  parseCommand,
  logInputCommand,
  sendCommandWithLog,
  RegCommandRequest,
  RegCommandResponse,
  AddUserToRoomCommandRequest,
  Ship,
  AddShipsRequest,
  AttackRequest,
  RandomAttackRequest,
} from "./command.js";
import { COMMAND } from "./constants.js";
import { Duplex } from "stream";
import { GameField } from "./game/game-field.js";

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

interface PlayerGameState {
  index: number;
  ships: Ship[];
  enemyGameField: GameField;
  isBot?: boolean;
}

interface Game {
  players: PlayerGameState[];
  playerIndexTurn: number;
  singlePlay: boolean;
}

const BOT_PLAYER_INDEX = -1;
const wsClients: Map<number, WebSocket> = new Map();
const players: Player[] = [];
const winners: Winner[] = [];
let rooms: Room[] = [];
const games: Game[] = [];

type Message = [COMMAND, unknown];
type Messages = (((player: PlayerGameState) => Message) | Message)[];

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

const sendToGamePlayers = async (gameId: number, messages: Messages) => {
  for (const player of games[gameId].players) {
    for (const msg of messages) {
      const [cmd, data] = typeof msg === "function" ? msg(player) : msg;
      const playerData = players[player.index];
      if (playerData === undefined) continue;
      await sendCommandWithLog(playerData.stream)(cmd, data);
    }
  }
};

const botTurn = async (gameId: number) => {
  const indexPlayer = BOT_PLAYER_INDEX;
  const playerState = games[gameId].players.find(
    ({ index }) => index === indexPlayer
  );
  if (!playerState) return;
  const randomPosition = playerState.enemyGameField.getRandomCellPos();
  await attackCommand({ gameId, indexPlayer, ...randomPosition });
};

const attackCommand = async (data: AttackRequest) => {
  const { gameId, x, y, indexPlayer } = data;
  const { singlePlay, players: gamePlayers } = games[gameId];

  const playerStateIdx = gamePlayers.findIndex(
    ({ index }) => index === indexPlayer
  );

  const { status, missesAround } = gamePlayers[
    playerStateIdx
  ].enemyGameField.check({ x, y });

  if (indexPlayer !== games[gameId].playerIndexTurn) return;

  if (status === "miss" || status === "opened") {
    games[gameId].playerIndexTurn = gamePlayers
      .map(({ index }) => index)
      .filter((index) => index !== indexPlayer)[0];
  }
  const messages: Messages = [
    [
      COMMAND.ATTACK,
      { currentPlayer: indexPlayer, position: { x, y }, status },
    ],
    [COMMAND.TURN, { currentPlayer: games[gameId].playerIndexTurn }],
  ];
  if (
    (status === "killed" || status === "finished") &&
    missesAround !== undefined
  ) {
    for (const missedPos of missesAround) {
      messages.push(
        [
          COMMAND.ATTACK,
          {
            currentPlayer: indexPlayer,
            position: missedPos,
            status: "miss",
          },
        ],
        [COMMAND.TURN, { currentPlayer: games[gameId].playerIndexTurn }]
      );
    }
  }
  if (status === "finished") {
    const winnerName =
      indexPlayer === BOT_PLAYER_INDEX ? "bot" : players[indexPlayer].name;
    const winnerIdx = winners.findIndex(({ name }) => name === winnerName);
    if (winnerIdx === -1) {
      winners.push({ name: winnerName, wins: 1 });
    } else {
      winners[winnerIdx].wins += 1;
    }
    messages.push(
      [COMMAND.FINISH, { winPlayer: indexPlayer }],
      [COMMAND.UPDATE_WINNERS, winners]
    );
  } else if (singlePlay && games[gameId].playerIndexTurn === BOT_PLAYER_INDEX) {
    botTurn(gameId);
  }
  await sendToGamePlayers(gameId, messages);
};

const dispatchCommand =
  (duplexStream: Duplex, wsIndex: number) => async (commandData: string) => {
    const { type, data } = parseCommand(commandData);
    logInputCommand(type, data);
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
        const createPlayer = (index: number) => ({
          index,
          ships: [],
          enemyGameField: new GameField(),
        });
        games.push({
          players: [
            createPlayer(firstPlayerIndex),
            createPlayer(secondPlayerIndex),
          ],
          playerIndexTurn: firstPlayerIndex,
          singlePlay: false,
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
        break;
      case COMMAND.ADD_SHIPS: {
        const { gameId, ships, indexPlayer } = data as AddShipsRequest;
        const playerStateIdx = games[gameId].players.findIndex(
          ({ index }) => index === indexPlayer
        );
        games[gameId].players[playerStateIdx].ships = ships;

        const { players, singlePlay } = games[gameId];

        if (singlePlay || players.every(({ ships }) => ships.length > 0)) {
          const [playerOne, playerTwo] = players;
          if (singlePlay) {
            playerTwo.ships = playerOne.enemyGameField.generateShips();
          } else {
            playerOne.enemyGameField.placeShips(playerTwo.ships);
          }
          playerTwo.enemyGameField.placeShips(playerOne.ships);
          await sendToGamePlayers(gameId, [
            ({ index, ships }) => [
              COMMAND.START_GAME,
              {
                ships,
                currentPlayerIndex: index,
              },
            ],
            [COMMAND.TURN, { currentPlayer: games[gameId].playerIndexTurn }],
          ]);
        }
        break;
      }
      case COMMAND.ATTACK: {
        await attackCommand(data as AttackRequest);
        break;
      }
      case COMMAND.RANDOM_ATTACK: {
        const { gameId, indexPlayer } = data as RandomAttackRequest;
        const playerState = games[gameId].players.find(
          ({ index }) => index === indexPlayer
        );
        if (!playerState) return;
        const randomPosition = playerState.enemyGameField.getRandomCellPos();
        await attackCommand({ gameId, indexPlayer, ...randomPosition });
        break;
      }
      case COMMAND.SINGLE_PLAY: {
        const playerIndex = players.findIndex((p) => p.wsIndex === wsIndex);
        const idGame = games.length;
        games.push({
          players: [
            {
              index: playerIndex,
              ships: [],
              enemyGameField: new GameField(),
            },
            {
              index: -1,
              ships: [],
              enemyGameField: new GameField(),
              isBot: true,
            },
          ],
          playerIndexTurn: playerIndex,
          singlePlay: true,
        });
        sendCommandWithLog(duplexStream)(COMMAND.CREATE_GAME, {
          idGame,
          idPlayer: playerIndex,
        });
        rooms = rooms.filter((room) => room.roomUsers[0].index !== playerIndex);
        await sendToAll([onePlayerRoomsMessage()]);
        break;
      }
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
