import type { GameState } from '@/domain/entities/GameState'
import { endRound as endRoundDomain } from '@/domain/rules/round'

/**
 * Close the current round.
 *
 * Thin wrapper around the domain transition: same behaviour, exposed
 * at the use-case layer so the store / UI never reaches into
 * `@/domain/rules/round` directly.
 *
 * Pre-condition: the game must be `in-round` with a non-null round.
 * Use {@link shouldEndRound} (from `@/domain/entities/RoundState`) to
 * check whether ending the round is appropriate.
 */
export function endRound(game: GameState): GameState {
  return endRoundDomain(game)
}
