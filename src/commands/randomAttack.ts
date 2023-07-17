import { attackCommand } from "./attack.js";
import { CommandHandler, RandomAttackRequest } from "./types";

export const randomAttackCommand: CommandHandler<RandomAttackRequest> =
  async function (data) {
    const { games } = this.getGameServer();
    const { gameId, indexPlayer } = data;
    const playerState = games[gameId].players.find(
      ({ index }) => index === indexPlayer
    );
    if (!playerState) return;
    const randomPosition = playerState.enemyGameField.getRandomCellPos();
    await attackCommand.call(this, {
      gameId,
      indexPlayer,
      ...randomPosition,
    });
  };
