import { shuffle } from '@/domain/deck/shuffle'
import { isModifierCard, isNumberCard, type ActionCard, type Card } from '@/domain/entities/Card'
import type { GameState, PendingActionContext } from '@/domain/entities/GameState'
import type { PlayerRoundState } from '@/domain/entities/PlayerRoundState'
import { nextActivePlayerIndex, type RoundState } from '@/domain/entities/RoundState'
import type { RandomProvider } from '@/domain/ports/RandomProvider'
import { drawModifier, drawNumberCard } from '@/domain/rules/draw'

export interface DrawCardDeps {
  readonly random: RandomProvider
}

/**
 * Apply a single card draw.
 *
 * Determines the target automatically:
 *  - If a Flip Three sequence is in progress (`forcedDraws`), the target
 *    is the forced player.
 *  - Otherwise, the target is the active player.
 *
 * Behaviour by card kind:
 *  - Number  -> applied via the domain `drawNumberCard` rule (may bust,
 *               may trigger Second Chance, may reach Flip 7).
 *  - Modifier-> appended to the row.
 *  - Action  -> resolution is deferred:
 *      * during a Flip Three sequence: queued in `actionQueue`.
 *      * otherwise: stored in `pendingAction` for the UI to ask the
 *        origin player to pick a target.
 *
 * When the deck runs dry the discard pile is reshuffled in place
 * (Fisher-Yates via the injected `RandomProvider`).
 *
 * @throws if the game is not `in-round`, if `pendingAction` is already
 *         set, if the target is not active, or if both deck and discard
 *         are empty.
 */
export function drawCard(deps: DrawCardDeps, game: GameState): GameState {
  if (game.phase !== 'in-round' || game.round === null) {
    throw new Error(`drawCard: game is not in a round (phase=${game.phase}).`)
  }
  if (game.pendingAction !== null) {
    throw new Error('drawCard: a pending action must be resolved first.')
  }

  const round = game.round
  const targetIndex =
    game.forcedDraws !== null ? game.forcedDraws.targetIndex : round.activePlayerIndex
  const targetState = round.playerStates[targetIndex]
  if (targetState === undefined) {
    throw new Error(`drawCard: invalid target index ${targetIndex}.`)
  }
  if (targetState.status !== 'active') {
    throw new Error(
      `drawCard: target (${targetState.playerId}) is not active (status=${targetState.status}).`,
    )
  }

  // --- Reshuffle if the deck is empty ----------------------------------
  let workingDeck: readonly Card[] = game.deck
  let workingDiscard: readonly Card[] = game.discard
  if (workingDeck.length === 0) {
    if (workingDiscard.length === 0) {
      throw new Error('drawCard: deck and discard are both empty.')
    }
    workingDeck = shuffle(workingDiscard, deps.random)
    workingDiscard = []
  }

  // --- Pop the top card ------------------------------------------------
  const card = workingDeck[0] as Card
  const newDeck = workingDeck.slice(1)

  // --- Apply card by kind ----------------------------------------------
  let updatedTargetState: PlayerRoundState = targetState
  const discardAdditions: Card[] = []
  let queueAddition: ActionCard | null = null
  let immediatePendingAction: PendingActionContext | null = null

  if (isNumberCard(card)) {
    const outcome = drawNumberCard(targetState, card)
    updatedTargetState = outcome.state
    discardAdditions.push(...outcome.discarded)
  } else if (isModifierCard(card)) {
    const outcome = drawModifier(targetState, card)
    updatedTargetState = outcome.state
    discardAdditions.push(...outcome.discarded)
  } else {
    // Action card: defer resolution.
    if (game.forcedDraws !== null) {
      queueAddition = card
    } else {
      immediatePendingAction = { card, originIndex: targetIndex }
    }
  }

  // --- Apply the updated player state ---------------------------------
  const newPlayerStates = round.playerStates.map((s, i) =>
    i === targetIndex ? updatedTargetState : s,
  )

  // --- Advance the forced-draws progression ---------------------------
  let newForcedDraws = game.forcedDraws
  let newPendingAction = immediatePendingAction
  let newActionQueue: readonly ActionCard[] =
    queueAddition === null ? game.actionQueue : [...game.actionQueue, queueAddition]

  if (newForcedDraws !== null) {
    const newRemaining = newForcedDraws.remaining - 1
    const targetStillActive = updatedTargetState.status === 'active'

    if (newRemaining <= 0 || !targetStillActive) {
      // Sequence over - drain one queued action if any.
      newForcedDraws = null
      if (newPendingAction === null && newActionQueue.length > 0) {
        const [head, ...rest] = newActionQueue
        newPendingAction = { card: head as ActionCard, originIndex: targetIndex }
        newActionQueue = rest
      }
    } else {
      newForcedDraws = { ...newForcedDraws, remaining: newRemaining }
    }
  }

  // --- Advance the active player if they fell out (and we're idle) ----
  const intermediateRound: RoundState = { ...round, playerStates: newPlayerStates }
  const newRound = withAdvancedActiveIfIdle(intermediateRound, newPendingAction)

  return {
    ...game,
    deck: newDeck,
    discard: [...workingDiscard, ...discardAdditions],
    round: newRound,
    pendingAction: newPendingAction,
    actionQueue: newActionQueue,
    forcedDraws: newForcedDraws,
  }
}

/**
 * If there is no pending action (we're idle) AND the active player is
 * no longer active, hand the turn to the next active seat. Used at the
 * tail of every transition so the UI never sees an inconsistent state.
 */
function withAdvancedActiveIfIdle(
  round: RoundState,
  pendingAction: PendingActionContext | null,
): RoundState {
  if (pendingAction !== null) return round
  const activeIdx = round.activePlayerIndex
  const activeState = round.playerStates[activeIdx]
  if (activeState === undefined || activeState.status === 'active') return round
  const next = nextActivePlayerIndex(round, activeIdx)
  return { ...round, activePlayerIndex: next ?? activeIdx }
}
