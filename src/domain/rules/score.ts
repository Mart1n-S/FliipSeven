import type { PlayerRoundState } from '@/domain/entities/PlayerRoundState'
import { getModifierEffect } from '@/domain/value-objects/ModifierKind'

const FLIP7_BONUS = 15

export interface ScoreBreakdown {
  /** Raw sum of every number card value on the row. */
  readonly numberSum: number
  /** Number sum after applying every multiply modifier (only x2 in V1). */
  readonly multipliedSum: number
  /** Sum of additive modifier amounts (+2, +4, …, +10). */
  readonly additiveBonuses: number
  /** Either 0 or 15 depending on whether the player reached Flip 7. */
  readonly flip7Bonus: number
  /** Final score for the round (0 if busted or frozen). */
  readonly total: number
}

/**
 * Compute the round score for a player.
 *
 * Order, per the rules:
 *   1. Sum all number cards.
 *   2. Apply x2 (only on the number sum, never on additive modifiers).
 *   3. Add every additive modifier (+2 .. +10).
 *   4. Add 15 if the player reached Flip 7.
 *
 * Busted and frozen players always score 0, regardless of the cards in
 * front of them. Active and stayed players are scored normally; the
 * function therefore doubles as a "what would I score if I stayed?"
 * preview during play.
 */
export function calculateRoundScore(state: PlayerRoundState): ScoreBreakdown {
  if (state.status === 'busted' || state.status === 'frozen') {
    return {
      numberSum: 0,
      multipliedSum: 0,
      additiveBonuses: 0,
      flip7Bonus: 0,
      total: 0,
    }
  }

  const numberSum = state.numberCards.reduce((acc, card) => acc + card.value, 0)

  let multipliedSum = numberSum
  let additiveBonuses = 0

  for (const card of state.modifiers) {
    const effect = getModifierEffect(card.modifier)
    if (effect.kind === 'multiply') {
      multipliedSum *= effect.factor
    } else {
      additiveBonuses += effect.amount
    }
  }

  const flip7Bonus = state.status === 'flip7' ? FLIP7_BONUS : 0
  const total = multipliedSum + additiveBonuses + flip7Bonus

  return {
    numberSum,
    multipliedSum,
    additiveBonuses,
    flip7Bonus,
    total,
  }
}
