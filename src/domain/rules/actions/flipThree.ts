import type { Card, FlipThreeCard } from '@/domain/entities/Card'
import type { PlayerRoundState } from '@/domain/entities/PlayerRoundState'

const FLIP_THREE_DRAWS = 3

export interface FlipThreeAtomicOutcome {
  readonly state: PlayerRoundState
  readonly discarded: readonly Card[]
  readonly drawsOwed: number
}

/**
 * Atomic effect of a Flip Three card: the card is discarded and the
 * target must accept 3 additional draws. The target state itself is
 * unchanged at this stage - the draws are produced by the
 * `drawCard` use-case via the `forcedDraws` context.
 *
 * @throws if the target is not active.
 */
export function applyFlipThree(
  target: PlayerRoundState,
  card: FlipThreeCard,
): FlipThreeAtomicOutcome {
  if (target.status !== 'active') {
    throw new Error(
      `Flip Three can only target an active player (${target.playerId} is ${target.status}).`,
    )
  }

  return {
    state: target,
    discarded: [card],
    drawsOwed: FLIP_THREE_DRAWS,
  }
}
