type Command = {
  name: string,
  param1?: number,
  param2?: number,
};

export default function parseCommand(str: string): Command {
  let [ name, param1str, param2str ] = str.split(' ');

  const param1 = Number(param1str) || undefined;
  const param2 = Number(param2str) || undefined;
  return {
    name, param1, param2,
  }
}
