import type { GameState } from '@/domain/entities/GameState'
import type { PlayerRoundState } from '@/domain/entities/PlayerRoundState'
import { nextActivePlayerIndex, type RoundState } from '@/domain/entities/RoundState'

/**
 * Mark the currently active player as having chosen to "stay" and
 * advance the turn to the next active player.
 *
 * If no other active player exists, `activePlayerIndex` is left
 * untouched - callers should detect the end of round via
 * {@link shouldEndRound} and call the `endRound` use case.
 *
 * Pre-condition: the game must be `in-round` with an active round
 * whose current seat is `active`.
 */
export function stayPlayer(game: GameState): GameState {
  if (game.phase !== 'in-round' || game.round === null) {
    throw new Error(`stayPlayer: game is not in a round (phase=${game.phase}).`)
  }

  const round = game.round
  const activeIdx = round.activePlayerIndex
  const current = round.playerStates[activeIdx]

  if (current === undefined) {
    throw new Error(`stayPlayer: activePlayerIndex ${activeIdx} is out of bounds.`)
  }
  if (current.status !== 'active') {
    throw new Error(
      `stayPlayer: current player (${current.playerId}) is not active (status=${current.status}).`,
    )
  }

  const stayed: PlayerRoundState = { ...current, status: 'stayed' }
  const newPlayerStates = round.playerStates.map((s, i) => (i === activeIdx ? stayed : s))
  const intermediate: RoundState = { ...round, playerStates: newPlayerStates }
  const next = nextActivePlayerIndex(intermediate, activeIdx)

  return {
    ...game,
    round: { ...intermediate, activePlayerIndex: next ?? activeIdx },
  }
}
