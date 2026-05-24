import {
  isActionCard,
  isModifierCard,
  isNumberCard,
  type ActionCard,
  type Card,
  type FlipThreeCard,
} from '@/domain/entities/Card'
import type { PlayerRoundState } from '@/domain/entities/PlayerRoundState'
import { drawModifier, drawNumberCard } from '@/domain/rules/draw'

const FLIP_THREE_DRAWS = 3

export interface FlipThreeAtomicOutcome {
  readonly state: PlayerRoundState
  readonly discarded: readonly Card[]
  readonly drawsOwed: number
}

/**
 * Atomic effect of a Flip Three card: the card is discarded and the
 * target must accept 3 additional draws. The target state itself is
 * unchanged at this stage — the actual draws are produced by
 * {@link runFlipThreeDraws}.
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

export interface FlipThreeDrawsOutcome {
  readonly state: PlayerRoundState
  readonly discarded: readonly Card[]
  /**
   * Action cards drawn during the sequence. Per the rules they count
   * towards the draws but their effect is resolved **after** the
   * sequence, by the use-case layer (Freeze / Flip Three need targets,
   * Second Chance might be redirected).
   */
  readonly pendingActions: readonly ActionCard[]
  readonly drawnCount: number
}

/**
 * Source of cards drawn from the top of the deck.
 * Returns `null` if the deck is empty.
 */
export type CardSource = () => Card | null

/**
 * Orchestrate the Flip Three draws.
 *
 * Pulls up to {@link maxDraws} cards from `drawNext` and applies them
 * sequentially to the target:
 *  - Number → applied via {@link drawNumberCard} (may bust, may trigger
 *    Second Chance, may reach Flip 7)
 *  - Modifier → appended to the player's modifier row
 *  - Action → **not applied**, returned in `pendingActions` for the
 *    use-case layer to resolve afterwards
 *
 * The loop stops early if the target busts, reaches Flip 7, or the
 * deck runs dry (drawNext returns null).
 */
export function runFlipThreeDraws(
  target: PlayerRoundState,
  drawNext: CardSource,
  maxDraws: number = FLIP_THREE_DRAWS,
): FlipThreeDrawsOutcome {
  let state = target
  const discarded: Card[] = []
  const pendingActions: ActionCard[] = []
  let drawnCount = 0

  for (let i = 0; i < maxDraws; i += 1) {
    if (state.status !== 'active') break

    const card = drawNext()
    if (card === null) break
    drawnCount += 1

    if (isNumberCard(card)) {
      const outcome = drawNumberCard(state, card)
      state = outcome.state
      discarded.push(...outcome.discarded)
      continue
    }

    if (isModifierCard(card)) {
      const outcome = drawModifier(state, card)
      state = outcome.state
      discarded.push(...outcome.discarded)
      continue
    }

    if (isActionCard(card)) {
      pendingActions.push(card)
      continue
    }
  }

  return { state, discarded, pendingActions, drawnCount }
}
