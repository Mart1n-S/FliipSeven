import {
  isFlipThreeCard,
  isFreezeCard,
  isSecondChanceCard,
  type ActionCard,
} from '@/domain/entities/Card'
import type { PlayerRoundState } from '@/domain/entities/PlayerRoundState'

/**
 * Compute the list of player indexes that the {@link card} can target,
 * given the current `playerStates` and the player who drew the card
 * (`originIndex`).
 *
 * Encodes the rule book's targeting matrix:
 *  - **Freeze / Flip Three** : any active player (origin included).
 *  - **Second Chance**:
 *      - if the origin has no Second Chance slot yet, the card is kept
 *        by the origin (the only valid target);
 *      - otherwise the origin must hand it to another active player
 *        whose own slot is empty. If no such player exists, the
 *        returned array is empty - the caller should discard the card.
 */
export function getValidActionTargets(
  card: ActionCard,
  playerStates: readonly PlayerRoundState[],
  originIndex: number,
): number[] {
  if (isFreezeCard(card) || isFlipThreeCard(card)) {
    return collectIndexes(playerStates, (state) => state.status === 'active')
  }

  if (isSecondChanceCard(card)) {
    const origin = playerStates[originIndex]
    if (origin?.status === 'active' && origin.secondChance === null) {
      return [originIndex]
    }
    return collectIndexes(
      playerStates,
      (state, i) => i !== originIndex && state.status === 'active' && state.secondChance === null,
    )
  }

  return []
}

function collectIndexes(
  states: readonly PlayerRoundState[],
  predicate: (state: PlayerRoundState, index: number) => boolean,
): number[] {
  const result: number[] = []
  states.forEach((state, index) => {
    if (predicate(state, index)) result.push(index)
  })
  return result
}
