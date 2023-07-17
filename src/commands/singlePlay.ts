import { COMMAND, sendCommandWithLog } from "./command.js";
import { CommandHandler } from "./types";

export const singlePlayCommand: CommandHandler<unknown> = async function (
  _,
  socketData
) {
  if (socketData === undefined) return;
  const { wsIndex, duplexStream } = socketData;
  const gameServer = this.getGameServer();

  const playerIndex = gameServer.getPlayerIndexBySocket(wsIndex);
  const idGame = gameServer.addGame(playerIndex);

  sendCommandWithLog(duplexStream)(COMMAND.CREATE_GAME, {
    idGame,
    idPlayer: playerIndex,
  });
  gameServer.deleteRoomByPlayerId(playerIndex);
  await this.sendToAll([this.onePlayerRoomsMessage()]);
};
