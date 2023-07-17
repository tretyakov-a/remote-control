import { httpServer } from "./http_server/index.js";
import { createWebSocketStream, WebSocketServer, WebSocket } from "ws";
import { GameServer } from "./game/server.js";
import { CommandDispatcher } from "./commands/dispatcher.js";

const HTTP_PORT = 8181;
const WSS_PORT = 3000;

console.log(`Start static http server on the localhost:${HTTP_PORT}!`);
httpServer.listen(HTTP_PORT);

const wss = new WebSocketServer({ port: WSS_PORT });
console.log(`Start web socket server on the localhost:${WSS_PORT}!`);

const wsClients: Map<number, WebSocket> = new Map();

const gameServer = new GameServer();
const dispatcher = new CommandDispatcher(gameServer);

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

    //TODO: also delete game, if it exists, and send COMMAND.FINISH and COMMAND.UPDATE_WINNERS
    if (gameServer.disconnectPlayer(wsIndex)) {
      dispatcher.sendToAll([dispatcher.onePlayerRoomsMessage()]);
    }
    console.log(`Web socket ${wsIndex} has been destroyed`);
  };

  duplexStream.on("error", (err) => {
    console.error(err);
    handleDestroy();
  });

  duplexStream.on("data", dispatcher.dispatch({ duplexStream, wsIndex }));

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
