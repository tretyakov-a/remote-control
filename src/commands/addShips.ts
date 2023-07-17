import { COMMAND } from "./command.js";
import { AddShipsRequest, CommandHandler } from "./types";

export const addShipsCommand: CommandHandler<AddShipsRequest> = async function (
  data
) {
  const gameServer = this.getGameServer();
  const { gameId, ships, indexPlayer } = data as AddShipsRequest;
  gameServer.addShipsToGamePlayer(gameId, indexPlayer, ships);

  const { players, singlePlay } = gameServer.games[gameId];

  if (singlePlay || players.every(({ ships }) => ships.length > 0)) {
    const [playerOne, playerTwo] = players;
    if (singlePlay) {
      playerTwo.ships = playerOne.enemyGameField.generateShips();
    } else {
      playerOne.enemyGameField.placeShips(playerTwo.ships);
    }
    playerTwo.enemyGameField.placeShips(playerOne.ships);
    await this.sendToGamePlayers(gameId, [
      ({ index, ships }) => [
        COMMAND.START_GAME,
        {
          ships,
          currentPlayerIndex: index,
        },
      ],
      [
        COMMAND.TURN,
        { currentPlayer: gameServer.games[gameId].playerIndexTurn },
      ],
    ]);
  }
};
