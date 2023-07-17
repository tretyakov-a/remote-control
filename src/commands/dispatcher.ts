import { GameServer } from "game/server";
import {
  COMMAND,
  logInputCommand,
  parseCommand,
  sendCommandWithLog,
} from "./command.js";
import type {
  CommandHandler,
  CommandRequest,
  Message,
  Messages,
  SocketData,
} from "./types";
import { attackCommand } from "./attack.js";
import { regCommand } from "./reg.js";
import { createRoomCommand } from "./createRoom.js";
import { addUserToRoomCommand } from "./addUserToRoom.js";
import { addShipsCommand } from "./addShips.js";
import { randomAttackCommand } from "./randomAttack.js";
import { singlePlayCommand } from "./singlePlay.js";

export class CommandDispatcher {
  private gameServer: GameServer;
  private commands: {
    [key in COMMAND]?: CommandHandler<CommandRequest>;
  };

  constructor(gameServer: GameServer) {
    this.gameServer = gameServer;
    this.commands = {
      [COMMAND.REG]: regCommand,
      [COMMAND.CREATE_ROOM]: createRoomCommand,
      [COMMAND.ADD_USER_TO_ROOM]: addUserToRoomCommand,
      [COMMAND.ADD_SHIPS]: addShipsCommand,
      [COMMAND.ATTACK]: attackCommand,
      [COMMAND.RANDOM_ATTACK]: randomAttackCommand,
      [COMMAND.SINGLE_PLAY]: singlePlayCommand,
    };
  }

  public getGameServer = () => {
    return this.gameServer;
  };

  public onePlayerRoomsMessage = (): Message => {
    return [
      COMMAND.UPDATE_ROOM,
      this.gameServer.rooms.filter(({ roomUsers }) => roomUsers.length === 1),
    ];
  };

  public sendToAll = async (messages: Message[]) => {
    for (const { stream } of this.gameServer.players) {
      if (stream === null) continue;
      for (const [cmd, data] of messages) {
        await sendCommandWithLog(stream)(cmd, data);
      }
    }
  };

  public sendToGamePlayers = async (gameId: number, messages: Messages) => {
    for (const player of this.gameServer.games[gameId].players) {
      for (const msg of messages) {
        const [cmd, data] = typeof msg === "function" ? msg(player) : msg;
        const playerData = this.gameServer.players[player.index];
        if (playerData === undefined) continue;
        await sendCommandWithLog(playerData.stream)(cmd, data);
      }
    }
  };

  private performCommand =
    (socketData: SocketData) =>
    async <T>(command: CommandHandler<T>, data: unknown) => {
      await command.call(this, data as T, socketData);
    };

  public dispatch = (socketData: SocketData) => async (commandData: string) => {
    const { type, data } = parseCommand(commandData);
    logInputCommand(type, data);

    const command = this.commands[type];
    if (command !== undefined)
      await this.performCommand(socketData)(command, data);
  };
}
