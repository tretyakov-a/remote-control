import { COMMAND, sendCommandWithLog } from "./command.js";
import { CommandHandler, RegCommandRequest, RegCommandResponse } from "./types";

export const regCommand: CommandHandler<RegCommandRequest> = async function (
  data,
  socketData
) {
  if (socketData === undefined) return;
  const { duplexStream, wsIndex } = socketData;
  const { name, password } = data;
  const { players, winners } = this.getGameServer();
  const msgData: RegCommandResponse = {
    name,
    index: players.findIndex((p) => p.name === name),
    error: false,
    errorText: "",
  };
  const playerIdx = msgData.index;
  if (playerIdx === -1) {
    msgData.index = players.length;
    players.push({ name, password, stream: duplexStream, wsIndex });
  } else {
    if (players[playerIdx].password !== password) {
      return await sendCommandWithLog(duplexStream)(COMMAND.REG, {
        ...msgData,
        error: true,
        errorText: `Wrong password`,
      });
    }
    if (players[playerIdx].stream !== null) {
      return await sendCommandWithLog(duplexStream)(COMMAND.REG, {
        ...msgData,
        error: true,
        errorText: `Player ${name} already logged in`,
      });
    }
    players[playerIdx].stream = duplexStream;
    players[playerIdx].wsIndex = wsIndex;
  }
  await sendCommandWithLog(duplexStream)(COMMAND.REG, msgData);
  await this.sendToAll([
    [COMMAND.UPDATE_WINNERS, winners],
    this.onePlayerRoomsMessage(),
  ]);
};
