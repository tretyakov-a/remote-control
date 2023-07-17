import { AttackStatus, Position, Ship, ShipType } from "../commands/types";
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

const shipsInfo: [ShipType, number, number][] = [
  ["small", 4, 1],
  ["medium", 3, 2],
  ["large", 2, 3],
  ["huge", 1, 4],
];

const directions = [true, false];

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

  private isInBounds = (x: number, y: number) => {
    return x >= 0 && x < GAME_FIELD_SIZE && y >= 0 && y < GAME_FIELD_SIZE;
  };

  private isCellClosed = (pos: Position) => {
    const { x, y } = pos;
    return (
      this.isInBounds(x, y) && this.cells[y][x].state === CELL_STATE.CLOSED
    );
  };

  private isShip = (pos: Position) => {
    const { x, y } = pos;
    return this.isInBounds(x, y) && this.cells[y][x].value === CELL_VALUE.SHIP;
  };

  public isShipPlacementPossible = (ship: Ship) => {
    const shipCells = this.getShipCells(ship);
    const cellsAround = this.getCellsAround(ship);
    return (
      shipCells.length === ship.length &&
      shipCells.concat(cellsAround).every((pos) => !this.isShip(pos))
    );
  };

  private getShipCells = ({ position, direction, length }: Ship) => {
    const shipCells: Position[] = [];
    for (let i = 0; i < length; i += 1) {
      const cellY = position.y + (direction ? i : 0);
      const cellX = position.x + (direction ? 0 : i);
      if (this.isInBounds(cellX, cellY)) shipCells.push({ x: cellX, y: cellY });
    }
    return shipCells;
  };

  private getCellsAround = (ship: Ship, setOpen = false): Position[] => {
    const shipCells = this.getShipCells(ship);
    const cellsAround: string[] = [];
    for (const { x, y } of shipCells) {
      const missed = cellChecks
        .map(([dx, dy]) => ({ x: x + dx, y: y + dy }))
        .filter((pos) => this.isCellClosed(pos))
        .map((pos) => `${pos.x}:${pos.y}`);
      cellsAround.push(...missed);
    }

    const uniqueCells = [...new Set(cellsAround)]
      .map((pos) => {
        const [x, y] = pos.split(":").map(Number);
        if (setOpen) this.cells[y][x].state = CELL_STATE.OPENED;
        return { x, y };
      })
      .filter(
        ({ x, y }) => !shipCells.some((pos) => pos.x === x && pos.y === y)
      );
    return uniqueCells;
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
      const shotedCells = this.getShipCells(ship).filter(
        ({ x, y }) => this.cells[y][x].state === CELL_STATE.OPENED
      );

      if (shotedCells.length === ship.length) {
        result.status =
          this.shotedAmount === SHOTED_TO_WIN ? "finished" : "killed";
        result.missesAround = this.getCellsAround(ship, true);
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

  public generateShips = () => {
    const ships: Ship[] = [];

    const getShipOfType = (type: ShipType, length: number) => {
      const availibleShipPositions: Ship[] = [];
      for (const direction of directions) {
        for (let y = 0; y < GAME_FIELD_SIZE; y += 1) {
          for (let x = 0; x < GAME_FIELD_SIZE; x += 1) {
            const ship: Ship = {
              position: { x, y },
              direction,
              length,
              type,
            };
            if (this.isShipPlacementPossible(ship)) {
              availibleShipPositions.push(ship);
            }
          }
        }
      }
      return availibleShipPositions[
        randomNumber(0, availibleShipPositions.length - 1)
      ];
    };

    for (const [type, amount, length] of shipsInfo) {
      for (let i = 0; i < amount; i += 1) {
        const randomShip = getShipOfType(type, length);
        this.placeShips([randomShip]);
        ships.push(randomShip);
      }
    }
    return ships;
  };
}
