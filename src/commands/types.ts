import { Duplex } from "stream";
import { PlayerGameState } from "../game/types";
import { COMMAND } from "./command.js";
import { CommandDispatcher } from "./dispatcher.js";

export interface RegCommandRequest {
  name: string;
  password: string;
}

export interface RegCommandResponse {
  name: string;
  index: number;
  error: boolean;
  errorText: string;
}

export interface AddUserToRoomCommandRequest {
  indexRoom: number;
}

export interface CreateGameResponse {
  idGame: number;
  idPlayer: number;
}

export type ShipType = "small" | "medium" | "large" | "huge";

export type Ship = {
  position: Position;
  direction: boolean;
  length: number;
  type: ShipType;
};

export interface AddShipsRequest {
  gameId: number;
  ships: Ship[];
  indexPlayer: number;
}

export interface StartGameResponse {
  ships: Ship[];
  currentPlayerIndex: number;
}

export interface AttackRequest {
  gameId: number;
  x: number;
  y: number;
  indexPlayer: number;
}

export type AttackStatus = "miss" | "killed" | "shot";

export type Position = {
  x: number;
  y: number;
};

export interface AttackResponse {
  position: Position;
  currentPlayer: number;
  status: AttackStatus;
}

export interface RandomAttackRequest {
  gameId: number;
  indexPlayer: number;
}

export type CommandRequest = RandomAttackRequest &
  AttackRequest &
  AddShipsRequest &
  AddUserToRoomCommandRequest &
  RegCommandRequest;

export interface TurnResponse {
  currentPlayer: number;
}

export interface FinishResponse {
  winPlayer: number;
}

export interface CommandWithStringData {
  type: COMMAND;
  data: string;
}

export interface Command {
  type: COMMAND;
  data: unknown;
}

export type SocketData = {
  duplexStream: Duplex;
  wsIndex: number;
};

export type CommandHandler<T> = (
  this: CommandDispatcher,
  data: T,
  socketData?: SocketData
) => Promise<void>;

export type Message = [COMMAND, unknown];
export type Messages = (((player: PlayerGameState) => Message) | Message)[];
