import { Ship } from "commands/types.js";
import { GameField } from "./game-field.js";
import { Game, Player, Room, Winner } from "./types";

export const BOT_PLAYER_INDEX = -1;

export class GameServer {
  public players: Player[];
  public winners: Winner[];
  public rooms: Room[];
  public games: Game[];

  constructor() {
    this.players = [];
    this.winners = [];
    this.rooms = [];
    this.games = [];
  }

  public deleteRoomByPlayerId = (playerIndex: number) => {
    this.rooms = this.rooms.filter(
      (room) => room.roomUsers[0].index !== playerIndex
    );
  };

  public deleteRoomByRoomId = (roomIndex: number) => {
    this.rooms = this.rooms.filter(({ roomId }) => roomId !== roomIndex);
  };

  public disconnectPlayer = (wsIndex: number) => {
    const playerIdx = this.players.findIndex((p) => p.wsIndex === wsIndex);
    if (playerIdx !== -1) {
      this.players[playerIdx].wsIndex = null;
      this.players[playerIdx].stream = null;
      this.deleteRoomByPlayerId(playerIdx);
      return true;
    }
    return false;
  };

  public changeTurn = (gameId: number, playerIndex: number) => {
    const { players } = this.games[gameId];
    this.games[gameId].playerIndexTurn = players
      .map(({ index }) => index)
      .filter((index) => index !== playerIndex)[0];
  };

  public getPlayerIndexBySocket = (wsIndex: number) => {
    return this.players.findIndex((p) => p.wsIndex === wsIndex);
  };

  public findRoomByIndex = (roomIndex: number) => {
    return this.rooms.find(({ roomId }) => roomId === roomIndex);
  };

  public addRoom = (playerIndex: number) => {
    const roomId = this.rooms.length;
    this.rooms.push({
      roomId,
      roomUsers: [
        {
          index: playerIndex,
          name: this.players[playerIndex].name,
        },
      ],
    });
    return roomId;
  };

  public addGame = (
    firstPlayerIndex: number,
    secondPlayerIndex: number = BOT_PLAYER_INDEX
  ) => {
    const singlePlay = secondPlayerIndex === BOT_PLAYER_INDEX;
    const gameId = this.games.length;
    const createPlayer = (index: number, isBot = false) => ({
      index,
      ships: [],
      enemyGameField: new GameField(),
      isBot,
    });
    this.games.push({
      players: [
        createPlayer(firstPlayerIndex),
        createPlayer(secondPlayerIndex, singlePlay),
      ],
      playerIndexTurn: firstPlayerIndex,
      singlePlay,
    });
    return gameId;
  };

  public addShipsToGamePlayer = (
    gameId: number,
    playerIndex: number,
    ships: Ship[]
  ) => {
    const gamePlayers = this.games[gameId].players;
    const playerStateIdx = gamePlayers.findIndex(
      ({ index }) => index === playerIndex
    );
    gamePlayers[playerStateIdx].ships = ships;
  };

  public addWinner = (playerIndex: number) => {
    const winnerName =
      playerIndex === BOT_PLAYER_INDEX ? "bot" : this.players[playerIndex].name;

    const winnerIdx = this.winners.findIndex(({ name }) => name === winnerName);
    if (winnerIdx === -1) {
      this.winners.push({ name: winnerName, wins: 1 });
    } else {
      this.winners[winnerIdx].wins += 1;
    }
    return this.winners;
  };

  public perfomBotTurn = (gameId: number) => {
    const botPlayerState = this.games[gameId].players.find(
      ({ index }) => index === BOT_PLAYER_INDEX
    );
    if (!botPlayerState) return;
    return botPlayerState.enemyGameField.getRandomCellPos();
  };
}
