import { Duplex } from "stream";
import { GameField } from "./game-field.js";
import { Ship } from "../commands/types";

export interface Player {
  name: string;
  password: string;
  stream: Duplex | null;
  wsIndex: number | null;
}

export interface Winner {
  name: string;
  wins: number;
}

export interface RoomUser {
  name: string;
  index: number;
}

export interface Room {
  roomId: number;
  roomUsers: RoomUser[];
}

export interface PlayerGameState {
  index: number;
  ships: Ship[];
  enemyGameField: GameField;
  isBot?: boolean;
}

export interface Game {
  players: PlayerGameState[];
  playerIndexTurn: number;
  singlePlay: boolean;
}
