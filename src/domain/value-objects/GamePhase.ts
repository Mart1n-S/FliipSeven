/**
 * Top-level state of a game.
 *
 * - `setup`           : players entered, no round started yet
 * - `in-round`        : a round is currently being played (dealing + play)
 * - `between-rounds`  : a round just ended, waiting to start the next one
 * - `finished`        : at least one player reached the win threshold at the
 *                        end of a round; the game is over.
 */
export type GamePhase = 'setup' | 'in-round' | 'between-rounds' | 'finished'
