import { Duplex, Readable } from "stream";
import { COMMAND } from "./constants.js";

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

export interface TurnResponse {
  currentPlayer: number;
}

export interface FinishResponse {
  winPlayer: number;
}

interface CommandWithStringData {
  type: COMMAND;
  data: string;
}

interface Command {
  type: COMMAND;
  data: unknown;
}

const parseCommandJSON = (jsonString: string): Command => {
  const { type, data: dataJSON }: CommandWithStringData =
    JSON.parse(jsonString);
  const data = dataJSON === "" ? {} : JSON.parse(dataJSON);
  return {
    type,
    data,
  };
};

export const parseCommand = (str: string) => {
  const result = parseCommandJSON(str);
  return result;
};

const logCommand =
  (prefix: string) =>
  (command: string, data: unknown): void =>
    console.log(`${prefix} ${command} ${JSON.stringify(data)}`);

export const logInputCommand = logCommand("<-");

export const logOutputCommand = logCommand("->");

const withLog =
  (fn: typeof sendCommand) =>
  (duplexStream: Duplex | null) =>
  async (...args: [string, unknown]) => {
    const [command, data] = args;
    logOutputCommand(command, JSON.stringify(data));
    return await fn.call(null, duplexStream, ...args);
  };

export const sendCommand = async (
  writeStream: Duplex | null,
  command: string,
  data: unknown
): Promise<any> => {
  if (writeStream === null) return;
  const dataToSend = {
    type: command,
    data: JSON.stringify(data),
    id: "0",
  };
  const readStream = Readable.from(JSON.stringify(dataToSend));
  try {
    await new Promise((resolve, reject) => {
      readStream.on("end", resolve);
      readStream.on("error", reject);
      readStream.pipe(writeStream, { end: false }).on("error", reject);
    });
  } catch (error) {
    throw error;
  } finally {
    if (readStream) readStream.destroy();
  }
};

export const sendCommandWithLog = withLog(sendCommand);
