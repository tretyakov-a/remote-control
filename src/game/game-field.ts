import { AttackStatus, Position, Ship } from "command";
import { randomNumber } from "../utils.js";

export const GAME_FIELD_SIZE = 10;
export const SHOTED_TO_WIN = 20;

export enum CELL_VALUE {
  EMPTY = 0,
  SHIP = 1,
}

export enum CELL_STATE {
  CLOSED = 0,
  OPENED = 1,
}

export type CellCheckResult = {
  status: AttackStatus | "opened" | "finished";
  missesAround?: Position[];
};

const cellChecks = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

type GameCell = {
  state: CELL_STATE;
  value: CELL_VALUE;
  ship?: Ship;
};

export class GameField {
  private cells: GameCell[][];
  private shotedAmount: number;

  constructor() {
    this.cells = this.initGameField();
    this.shotedAmount = 0;
  }

  private initGameField = () => {
    const defaultCell: GameCell = {
      state: CELL_STATE.CLOSED,
      value: CELL_VALUE.EMPTY,
    };
    return Array.from({ length: GAME_FIELD_SIZE }, () =>
      Array.from({ length: GAME_FIELD_SIZE }, () => ({ ...defaultCell }))
    );
  };

  public print = () => {
    for (let y = 0; y < GAME_FIELD_SIZE; y += 1) {
      const row = [];
      for (let x = 0; x < GAME_FIELD_SIZE; x += 1) {
        row.push(this.cells[y][x].value);
      }
      console.log(row.join(" "));
    }
  };

  public placeShips = (ships: Ship[]) => {
    for (const ship of ships) {
      const {
        position: { x, y },
        direction,
        length,
      } = ship;
      for (let i = 0; i < length; i += 1) {
        const cellY = y + (direction ? i : 0);
        const cellX = x + (direction ? 0 : i);
        this.cells[cellY][cellX].value = CELL_VALUE.SHIP;
        this.cells[cellY][cellX].ship = ship;
      }
    }
  };

  private checkCell = (pos: Position) => {
    const { x, y } = pos;
    return (
      x >= 0 &&
      x < GAME_FIELD_SIZE &&
      y >= 0 &&
      y < GAME_FIELD_SIZE &&
      this.cells[y][x].state === CELL_STATE.CLOSED
    );
  };

  public check = (pos: Position): CellCheckResult => {
    const { x, y } = pos;
    const result: CellCheckResult = { status: "opened" };
    if (this.cells[y][x].state === CELL_STATE.OPENED) return result;
    this.cells[y][x].state = CELL_STATE.OPENED;
    const { value, ship } = this.cells[y][x];
    result.status = "miss";

    if (value === CELL_VALUE.SHIP && ship !== undefined) {
      this.shotedAmount += 1;
      const { direction, position, length } = ship;
      const shotedCells: Position[] = [];
      for (let i = 0; i < length; i += 1) {
        const cellY = position.y + (direction ? i : 0);
        const cellX = position.x + (direction ? 0 : i);
        if (this.cells[cellY][cellX].state === CELL_STATE.OPENED) {
          shotedCells.push({ x: cellX, y: cellY });
        }
      }

      if (shotedCells.length === length) {
        result.status =
          this.shotedAmount === SHOTED_TO_WIN ? "finished" : "killed";
        const missesAround: string[] = [];
        for (const { x, y } of shotedCells) {
          const missed = cellChecks
            .map(([dx, dy]) => ({ x: x + dx, y: y + dy }))
            .filter((pos) => this.checkCell(pos))
            .map((pos) => `${pos.x}:${pos.y}`);
          missesAround.push(...missed);
        }
        result.missesAround = [...new Set(missesAround)].map((pos) => {
          const [x, y] = pos.split(":").map(Number);
          this.cells[y][x].state = CELL_STATE.OPENED;
          return { x, y };
        });
      } else {
        result.status = "shot";
      }
    }
    return result;
  };

  public getRandomCellPos = () => {
    let pos: Position;
    do {
      const x = randomNumber(0, GAME_FIELD_SIZE - 1);
      const y = randomNumber(0, GAME_FIELD_SIZE - 1);
      pos = { x, y };
    } while (this.cells[pos.y][pos.x].state !== CELL_STATE.CLOSED);
    return pos;
  };
}
