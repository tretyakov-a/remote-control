import { CommandHandler } from "./types";

export const createRoomCommand: CommandHandler<unknown> = async function (
  _,
  socketData
) {
  if (socketData === undefined) return;
  const { wsIndex } = socketData;
  const gameServer = this.getGameServer();
  const playerIdx = gameServer.getPlayerIndexBySocket(wsIndex);

  if (playerIdx === -1) return;

  gameServer.addRoom(playerIdx);

  await this.sendToAll([this.onePlayerRoomsMessage()]);
};
