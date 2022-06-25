import { Duplex, Readable } from "stream";
import { NUL } from './common/constants.js';

type Command = {
  name: string,
  param1?: number,
  param2?: number,
};

export const parseCommand = (str: string): Command => {
  let [ name, param1str, param2str ] = str.split(' ');

  const param1 = Number(param1str) || undefined;
  const param2 = Number(param2str) || undefined;
  return {
    name, param1, param2,
  }
}

const MAX_LOG_DATA_LENGTH = 128;

const logCommand = (prefix: string) => (command: string): void => console.log(`${prefix} ${command}`);

export const logInputCommand = logCommand('->');

export const logOutputCommand = logCommand('<-');

const withLog = (fn: Function) => (...args: [Duplex, string, string]) => {
  const [ _, command, data ] = args;
  logOutputCommand(`${command} ${data.length > MAX_LOG_DATA_LENGTH ? '[...very long string here...]' : data}`);
  return fn.apply(null, args);
}

export const sendCommand = async (writeStream: Duplex, command: string, data: string): Promise<any>  => {
  const readStream = Readable.from(`${command} ${data}${NUL}`);
  try {
    await new Promise((resolve, reject) => {
      readStream.on('end', resolve);
      readStream.on('error', reject);
      readStream.pipe(writeStream, { end: false })
        .on('error', reject);
    });
  } catch (error) {
    throw error;
  } finally {
    if (readStream) readStream.destroy();
  }
}

export const sendCommandWithLog = withLog(sendCommand);