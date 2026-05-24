import type { SecondChanceCard } from '@/domain/entities/Card'
import type { PlayerRoundState } from '@/domain/entities/PlayerRoundState'

/**
 * Place a Second Chance card in a player's dedicated slot.
 *
 * Used both for the initial recipient and for any redirection
 * (when the recipient already had one and chose to pass it on).
 *
 * @throws if the target is not active.
 * @throws if the target already holds a Second Chance card —
 *         the caller (use-case layer) must redirect or discard
 *         the card before reaching this function.
 */
export function placeSecondChance(
  target: PlayerRoundState,
  card: SecondChanceCard,
): PlayerRoundState {
  if (target.status !== 'active') {
    throw new Error(
      `Second Chance can only be placed on an active player (${target.playerId} is ${target.status}).`,
    )
  }
  if (target.secondChance !== null) {
    throw new Error(`Player ${target.playerId} already holds a Second Chance card.`)
  }

  return { ...target, secondChance: card }
}

export interface ClearSecondChancesResult {
  readonly states: readonly PlayerRoundState[]
  readonly discarded: readonly SecondChanceCard[]
}

/**
 * Strip every player's Second Chance slot. Called at the end of a
 * round: per the rules, all Second Chance cards are discarded then,
 * even those never used.
 *
 * The order of `states` is preserved.
 */
export function clearAllSecondChances(
  states: readonly PlayerRoundState[],
): ClearSecondChancesResult {
  const discarded: SecondChanceCard[] = []
  const next: PlayerRoundState[] = states.map((state) => {
    if (state.secondChance === null) return state
    discarded.push(state.secondChance)
    return { ...state, secondChance: null }
  })

  return { states: next, discarded }
}
