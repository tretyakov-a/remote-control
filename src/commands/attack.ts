import { BOT_PLAYER_INDEX } from "../game/server.js";
import { COMMAND } from "./command.js";
import { AttackRequest, CommandHandler, Messages } from "./types";

export const attackCommand: CommandHandler<AttackRequest> = async function (
  data
) {
  const gameServer = this.getGameServer();
  const { games } = gameServer;
  const { gameId, x, y, indexPlayer } = data;
  const { singlePlay, players: gamePlayers } = games[gameId];

  const playerStateIdx = gamePlayers.findIndex(
    ({ index }) => index === indexPlayer
  );

  const { status, missesAround } = gamePlayers[
    playerStateIdx
  ].enemyGameField.check({ x, y });

  if (indexPlayer !== games[gameId].playerIndexTurn) return;

  if (status === "miss" || status === "opened") {
    gameServer.changeTurn(gameId, indexPlayer);
  }

  const currentTurnPlayerIndex = games[gameId].playerIndexTurn;
  const messages: Messages = [];
  if (status !== "opened") {
    messages.push([
      COMMAND.ATTACK,
      { currentPlayer: indexPlayer, position: { x, y }, status },
    ]);
  }
  messages.push([COMMAND.TURN, { currentPlayer: currentTurnPlayerIndex }]);
  if (
    (status === "killed" || status === "finished") &&
    missesAround !== undefined
  ) {
    for (const missedPos of missesAround) {
      messages.push(
        [
          COMMAND.ATTACK,
          {
            currentPlayer: indexPlayer,
            position: missedPos,
            status: "miss",
          },
        ],
        [COMMAND.TURN, { currentPlayer: currentTurnPlayerIndex }]
      );
    }
  }
  if (status === "finished") {
    const winners = gameServer.addWinner(indexPlayer);
    messages.push(
      [COMMAND.FINISH, { winPlayer: indexPlayer }],
      [COMMAND.UPDATE_WINNERS, winners]
    );
  }

  await this.sendToGamePlayers(gameId, messages);

  if (
    singlePlay &&
    currentTurnPlayerIndex === BOT_PLAYER_INDEX &&
    status !== "finished"
  ) {
    const position = gameServer.perfomBotTurn(gameId);
    if (position !== undefined) {
      await attackCommand.call(this, {
        gameId,
        indexPlayer: BOT_PLAYER_INDEX,
        ...position,
      });
    }
  }
};
