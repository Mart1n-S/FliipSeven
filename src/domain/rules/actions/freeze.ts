import type { Card, FreezeCard } from '@/domain/entities/Card'
import type { PlayerRoundState } from '@/domain/entities/PlayerRoundState'

export interface FreezeOutcome {
  readonly state: PlayerRoundState
  readonly discarded: readonly Card[]
}

/**
 * Apply a Freeze card to its target.
 *
 * Per the rules, the target loses all the points accumulated **for the
 * current round** and is eliminated for the rest of the round. Their
 * cards stay on the row (they are sent to discard at end of round).
 *
 * The Freeze card itself goes straight to the discard pile.
 *
 * @throws if the target is not active.
 */
export function applyFreeze(target: PlayerRoundState, card: FreezeCard): FreezeOutcome {
  if (target.status !== 'active') {
    throw new Error(
      `Freeze can only target an active player (${target.playerId} is ${target.status}).`,
    )
  }

  return {
    state: { ...target, status: 'frozen' },
    discarded: [card],
  }
}
