import type { Card, ModifierCard, NumberCard } from '@/domain/entities/Card'
import { hasNumberValue, type PlayerRoundState } from '@/domain/entities/PlayerRoundState'

const FLIP7_THRESHOLD = 7

/**
 * Outcome of a draw applied to a single player's round state.
 *
 * - `state` is the **new** player state (input is never mutated)
 * - `discarded` is the list of cards that must go to the discard pile
 *   (non-empty only when a Second Chance neutralises a duplicate)
 */
export interface DrawResult {
  readonly state: PlayerRoundState
  readonly discarded: readonly Card[]
}

function ensureActive(state: PlayerRoundState): void {
  if (state.status !== 'active') {
    throw new Error(
      `Cannot draw a card: player ${state.playerId} is not active (status=${state.status}).`,
    )
  }
}

/**
 * Apply a Number card draw.
 *
 * Behaviour:
 * - Unique value → card is added to the row. If the row now holds 7 unique
 *   number cards, status becomes `flip7`.
 * - Duplicate value:
 *   - If a Second Chance is held, both the duplicate and the SC are sent
 *     to the discard pile and the player stays `active`.
 *   - Otherwise the player is `busted`; the duplicate card stays on the
 *     row (it will go to the discard pile at end of round).
 */
export function drawNumberCard(state: PlayerRoundState, card: NumberCard): DrawResult {
  ensureActive(state)

  const duplicate = hasNumberValue(state, card.value)

  if (duplicate) {
    if (state.secondChance !== null) {
      return {
        state: { ...state, secondChance: null },
        discarded: [card, state.secondChance],
      }
    }
    return {
      state: {
        ...state,
        numberCards: [...state.numberCards, card],
        status: 'busted',
      },
      discarded: [],
    }
  }

  const numberCards = [...state.numberCards, card]
  const reachesFlip7 = numberCards.length >= FLIP7_THRESHOLD

  return {
    state: {
      ...state,
      numberCards,
      status: reachesFlip7 ? 'flip7' : state.status,
    },
    discarded: [],
  }
}

/**
 * Apply a Modifier card draw. Always succeeds for an active player;
 * modifiers never bust.
 */
export function drawModifier(state: PlayerRoundState, card: ModifierCard): DrawResult {
  ensureActive(state)

  return {
    state: { ...state, modifiers: [...state.modifiers, card] },
    discarded: [],
  }
}
