import { Duplex, Readable } from "stream";
import { COMMAND } from "./constants.js";

export type RegCommandRequest = {
  name: string;
  password: string;
};

export type RegCommandResponse = {
  name: string;
  index: number;
  error: boolean;
  errorText: string;
};

export type AddUserToRoomCommandRequest = {
  indexRoom: number;
};

export type CreateGameResponse = {
  idGame: number;
  idPlayer: number;
};

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
  (command: string): void =>
    console.log(`${prefix} ${command}`);

export const logInputCommand = logCommand("<-");

export const logOutputCommand = logCommand("->");

const withLog =
  (fn: typeof sendCommand) =>
  (duplexStream: Duplex | null) =>
  async (...args: [string, unknown]) => {
    const [command, data] = args;
    logOutputCommand(`${command} ${JSON.stringify(data)}`);
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
