import { Duplex, Readable } from "stream";
import { Command, CommandWithStringData } from "./types";

export enum COMMAND {
  REG = "reg",
  UPDATE_WINNERS = "update_winners",
  UPDATE_ROOM = "update_room",
  CREATE_ROOM = "create_room",
  ADD_USER_TO_ROOM = "add_user_to_room",
  CREATE_GAME = "create_game",
  ADD_SHIPS = "add_ships",
  START_GAME = "start_game",

  TURN = "turn",
  ATTACK = "attack",
  RANDOM_ATTACK = "randomAttack",
  FINISH = "finish",

  SINGLE_PLAY = "single_play",
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
): Promise<void> => {
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
  } finally {
    if (readStream) readStream.destroy();
  }
};

export const sendCommandWithLog = withLog(sendCommand);
