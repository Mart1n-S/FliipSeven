import { shuffle } from '@/domain/deck/shuffle'
import { isModifierCard, isNumberCard, type ActionCard, type Card } from '@/domain/entities/Card'
import type { GameState, PendingActionContext } from '@/domain/entities/GameState'
import type { PlayerRoundState } from '@/domain/entities/PlayerRoundState'
import { nextActivePlayerIndex, type RoundState } from '@/domain/entities/RoundState'
import type { RandomProvider } from '@/domain/ports/RandomProvider'
import { advanceDealQueueIfIdle } from '@/domain/rules/deal'
import { drawModifier, drawNumberCard } from '@/domain/rules/draw'

export interface DrawCardDeps {
  readonly random: RandomProvider
}

/**
 * Apply a single card draw.
 *
 * Target priority:
 *  1. `forcedDraws.targetIndex` (Flip Three sequence in progress)
 *  2. `dealQueue[0]` (initial deal phase at round start)
 *  3. `round.activePlayerIndex` (normal play)
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
 * Turn rotation: after a **normal-play** draw (i.e. not part of a
 * forced-draws sequence and not part of the initial deal), the active
 * player rotates to the next active seat. Forced draws and the
 * initial deal don't consume a play-phase turn.
 *
 * After the draw + rotation logic, {@link advanceDealQueueIfIdle} is
 * called so the deal queue progresses to the next dealee as soon as
 * the current dealee's action chain settles.
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
  const wasInForcedDraws = game.forcedDraws !== null
  const wasInDealPhase = !wasInForcedDraws && game.dealQueue !== null && game.dealQueue.length > 0
  const targetIndex = pickTargetIndex(game, round)
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

  // --- Active-player rotation ----------------------------------------
  // Only rotate during normal play. Forced draws (Flip Three) and the
  // initial deal phase manage their own target ordering and don't
  // consume a play-phase turn.
  const intermediateRound: RoundState = { ...round, playerStates: newPlayerStates }
  const newRound =
    wasInForcedDraws || wasInDealPhase
      ? intermediateRound
      : withAdvancedActive(intermediateRound, round.activePlayerIndex)

  const intermediateGame: GameState = {
    ...game,
    deck: newDeck,
    discard: [...workingDiscard, ...discardAdditions],
    round: newRound,
    pendingAction: newPendingAction,
    actionQueue: newActionQueue,
    forcedDraws: newForcedDraws,
  }

  // Pop the deal queue if the dealee's action chain just settled.
  return advanceDealQueueIfIdle(intermediateGame)
}

/**
 * Hand the turn to the next active seat after a normal-play draw.
 * Returns the same round when no other active player exists (the sole
 * remaining active keeps playing alone, per the rule book).
 */
function withAdvancedActive(round: RoundState, fromIndex: number): RoundState {
  const next = nextActivePlayerIndex(round, fromIndex)
  return { ...round, activePlayerIndex: next ?? fromIndex }
}

/**
 * Pick the draw target according to priority: forced draws > deal
 * queue > active player.
 */
function pickTargetIndex(game: GameState, round: RoundState): number {
  if (game.forcedDraws !== null) return game.forcedDraws.targetIndex
  if (game.dealQueue !== null && game.dealQueue.length > 0) {
    return game.dealQueue[0] as number
  }
  return round.activePlayerIndex
}
