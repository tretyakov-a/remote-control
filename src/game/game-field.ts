import { Ship } from "command";

export const GAME_FIELD_SIZE = 10;

export enum CELL_VALUE {
  EMPTY = 0,
  SHIP = 1,
}

export enum CELL_STATE {
  CLOSED = 0,
  OPENED = 1,
}

type GameCell = {
  state: CELL_STATE;
  value: CELL_VALUE;
};

export class GameField {
  private cells: GameCell[][];

  constructor() {
    this.cells = this.initGameField();
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
    for (const {
      position: { x, y },
      direction,
      length,
    } of ships) {
      for (let i = 0; i < length; i += 1) {
        this.cells[y + (direction ? i : 0)][x + (direction ? 0 : i)].value =
          CELL_VALUE.SHIP;
      }
    }
  };
}
