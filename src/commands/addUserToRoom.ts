import { COMMAND, sendCommandWithLog } from "./command.js";
import { AddUserToRoomCommandRequest, CommandHandler } from "./types";

export const addUserToRoomCommand: CommandHandler<AddUserToRoomCommandRequest> =
  async function (data, socketData) {
    if (socketData === undefined) return;
    const { wsIndex } = socketData;
    const gameServer = this.getGameServer();
    const { indexRoom } = data;
    const secondPlayerIndex = gameServer.getPlayerIndexBySocket(wsIndex);
    const room = gameServer.findRoomByIndex(indexRoom);

    if (room === undefined || secondPlayerIndex === -1) return;

    const firstPlayerIndex = room.roomUsers[0].index;
    if (firstPlayerIndex === secondPlayerIndex) return;

    const idGame = gameServer.addGame(firstPlayerIndex, secondPlayerIndex);
    const sendCreateGameCommand = (idPlayer: number) =>
      sendCommandWithLog(gameServer.players[idPlayer].stream)(
        COMMAND.CREATE_GAME,
        {
          idGame,
          idPlayer,
        }
      );
    await sendCreateGameCommand(firstPlayerIndex);
    await sendCreateGameCommand(secondPlayerIndex);
    gameServer.deleteRoomByRoomId(indexRoom);
    await this.sendToAll([this.onePlayerRoomsMessage()]);
  };
