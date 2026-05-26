import { shuffle } from '@/domain/deck/shuffle'
import { isActionCard, isModifierCard, isNumberCard, type Card } from '@/domain/entities/Card'
import type {
  ForcedDrawsContext,
  GameState,
  PendingActionContext,
  QueuedAction,
} from '@/domain/entities/GameState'
import type { PlayerRoundState } from '@/domain/entities/PlayerRoundState'
import { nextActivePlayerIndex, type RoundState } from '@/domain/entities/RoundState'
import type { RandomProvider } from '@/domain/ports/RandomProvider'
import { advanceDealQueueIfIdle } from '@/domain/rules/deal'
import { drawModifier, drawNumberCard } from '@/domain/rules/draw'

export interface DrawCardDeps {
  readonly random: RandomProvider
}

/** Intermediate result of applying a single drawn card to a target. */
interface CardApplication {
  readonly updatedTargetState: PlayerRoundState
  readonly discardAdditions: readonly Card[]
  readonly queueAddition: QueuedAction | null
  readonly immediatePendingAction: PendingActionContext | null
}

/** Result of advancing the forced-draws progression after one draw. */
interface ForcedProgression {
  readonly newForcedDraws: ForcedDrawsContext | null
  readonly newPendingAction: PendingActionContext | null
  readonly newActionQueue: readonly QueuedAction[]
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
 * Flip Three sequence: per the rule book, the three cards are flipped
 * even if the target busts mid-sequence. After the bust, Number /
 * Modifier cards are simply sent to the discard pile (they do not
 * touch the busted player's row); Action cards are still queued and
 * resolved afterwards, with the busted target choosing where to send
 * them. The sequence still ends early on Flip 7 (per "le jeu s'arrête").
 *
 * Turn rotation: after a **normal-play** draw (i.e. not part of a
 * forced-draws sequence and not part of the initial deal), the active
 * player rotates to the next active seat. Forced draws and the
 * initial deal don't consume a play-phase turn. When a forced sequence
 * just ended and the active seat is no longer active (typical when
 * the active player drew on themselves and busted), we rotate so the
 * UI doesn't park on a busted player.
 *
 * After the draw + rotation logic, {@link advanceDealQueueIfIdle} is
 * called so the deal queue progresses to the next dealee as soon as
 * the current dealee's action chain settles.
 *
 * When the deck runs dry the discard pile is reshuffled in place
 * (Fisher-Yates via the injected `RandomProvider`).
 *
 * @throws if the game is not `in-round`, if `pendingAction` is already
 *         set, if the target is not active (outside of an ongoing
 *         forced sequence), or if both deck and discard are empty.
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
  const targetState = resolveDrawTarget(round, targetIndex, wasInForcedDraws)

  const { deck: workingDeck, discard: workingDiscard } = ensureDeck(
    game.deck,
    game.discard,
    deps.random,
  )

  const card = workingDeck[0] as Card
  const newDeck = workingDeck.slice(1)

  const application = applyCardToTarget(card, targetState, targetIndex, wasInForcedDraws)

  const newPlayerStates = round.playerStates.map((s, i) =>
    i === targetIndex ? application.updatedTargetState : s,
  )

  const progression = advanceForcedDraws(game.forcedDraws, game.actionQueue, application)

  const intermediateRound: RoundState = { ...round, playerStates: newPlayerStates }
  const newRound = computeNewRound({
    round: intermediateRound,
    originalActiveIndex: round.activePlayerIndex,
    wasInForcedDraws,
    wasInDealPhase,
    forcedJustEnded: wasInForcedDraws && progression.newForcedDraws === null,
    hasPendingAction: progression.newPendingAction !== null,
  })

  const intermediateGame: GameState = {
    ...game,
    deck: newDeck,
    discard: [...workingDiscard, ...application.discardAdditions],
    round: newRound,
    pendingAction: progression.newPendingAction,
    actionQueue: progression.newActionQueue,
    forcedDraws: progression.newForcedDraws,
  }

  return advanceDealQueueIfIdle(intermediateGame)
}

function resolveDrawTarget(
  round: RoundState,
  targetIndex: number,
  wasInForcedDraws: boolean,
): PlayerRoundState {
  const targetState = round.playerStates[targetIndex]
  if (targetState === undefined) {
    throw new Error(`drawCard: invalid target index ${targetIndex}.`)
  }
  const allowBustedDuringForced = wasInForcedDraws && targetState.status === 'busted'
  if (targetState.status !== 'active' && !allowBustedDuringForced) {
    throw new Error(
      `drawCard: target (${targetState.playerId}) is not active (status=${targetState.status}).`,
    )
  }
  return targetState
}

function ensureDeck(
  deck: readonly Card[],
  discard: readonly Card[],
  random: RandomProvider,
): { deck: readonly Card[]; discard: readonly Card[] } {
  if (deck.length > 0) return { deck, discard }
  if (discard.length === 0) {
    throw new Error('drawCard: deck and discard are both empty.')
  }
  return { deck: shuffle(discard, random), discard: [] }
}

/**
 * Decide what happens to {@link card} given the current target.
 *
 * - Active target: Number / Modifier go through the domain rules,
 *   Action cards are queued (forced sequence) or set as pending.
 * - Busted target during a forced sequence: Number / Modifier go
 *   straight to the discard pile, Action cards are still queued.
 */
function applyCardToTarget(
  card: Card,
  targetState: PlayerRoundState,
  targetIndex: number,
  wasInForcedDraws: boolean,
): CardApplication {
  const targetIsActive = targetState.status === 'active'

  if (isNumberCard(card)) {
    if (!targetIsActive) return discardOnly(targetState, card)
    const outcome = drawNumberCard(targetState, card)
    return {
      updatedTargetState: outcome.state,
      discardAdditions: outcome.discarded,
      queueAddition: null,
      immediatePendingAction: null,
    }
  }

  if (isModifierCard(card)) {
    if (!targetIsActive) return discardOnly(targetState, card)
    const outcome = drawModifier(targetState, card)
    return {
      updatedTargetState: outcome.state,
      discardAdditions: outcome.discarded,
      queueAddition: null,
      immediatePendingAction: null,
    }
  }

  // Action card: defer resolution.
  if (isActionCard(card)) {
    return {
      updatedTargetState: targetState,
      discardAdditions: [],
      queueAddition: wasInForcedDraws ? { card, originIndex: targetIndex } : null,
      immediatePendingAction: wasInForcedDraws ? null : { card, originIndex: targetIndex },
    }
  }

  return {
    updatedTargetState: targetState,
    discardAdditions: [],
    queueAddition: null,
    immediatePendingAction: null,
  }
}

function discardOnly(targetState: PlayerRoundState, card: Card): CardApplication {
  return {
    updatedTargetState: targetState,
    discardAdditions: [card],
    queueAddition: null,
    immediatePendingAction: null,
  }
}

/**
 * Update the forced-draws progression after one card has been drawn.
 *
 * The sequence ends when:
 *  - `remaining` falls to 0 (three cards have been drawn), or
 *  - the target reaches Flip 7 (the round is about to end).
 *
 * A bust does **not** end the sequence: per the rules, the three
 * cards keep being flipped (the target picks targets for any queued
 * actions afterwards).
 */
function advanceForcedDraws(
  forced: ForcedDrawsContext | null,
  queue: readonly QueuedAction[],
  application: CardApplication,
): ForcedProgression {
  const baseQueue: readonly QueuedAction[] =
    application.queueAddition === null ? queue : [...queue, application.queueAddition]

  if (forced === null) {
    return {
      newForcedDraws: null,
      newPendingAction: application.immediatePendingAction,
      newActionQueue: baseQueue,
    }
  }

  const newRemaining = forced.remaining - 1
  const targetReachedFlip7 = application.updatedTargetState.status === 'flip7'
  const sequenceOver = newRemaining <= 0 || targetReachedFlip7

  if (!sequenceOver) {
    return {
      newForcedDraws: { ...forced, remaining: newRemaining },
      newPendingAction: application.immediatePendingAction,
      newActionQueue: baseQueue,
    }
  }

  // Sequence over - drain one queued action if any. Each queued
  // action carries its own `originIndex` (= the player whose sequence
  // produced it), so a Freeze queued during P2's sequence is still
  // resolved by P2 even after a sub-sequence has run.
  if (application.immediatePendingAction === null && baseQueue.length > 0) {
    const head = baseQueue[0] as QueuedAction
    return {
      newForcedDraws: null,
      newPendingAction: { card: head.card, originIndex: head.originIndex },
      newActionQueue: baseQueue.slice(1),
    }
  }

  return {
    newForcedDraws: null,
    newPendingAction: application.immediatePendingAction,
    newActionQueue: baseQueue,
  }
}

interface NewRoundInput {
  readonly round: RoundState
  readonly originalActiveIndex: number
  readonly wasInForcedDraws: boolean
  readonly wasInDealPhase: boolean
  readonly forcedJustEnded: boolean
  readonly hasPendingAction: boolean
}

/**
 * Pick the active-player rotation rule for the new round state.
 *
 * - Forced draws / deal phase: keep the active seat as-is, UNLESS the
 *   forced sequence just ended with no queued action AND the active
 *   seat is no longer active (rotate to the next active seat).
 * - Normal play: rotate to the next active seat.
 */
function computeNewRound(input: NewRoundInput): RoundState {
  if (input.wasInDealPhase) return input.round
  if (input.wasInForcedDraws) {
    if (input.forcedJustEnded && !input.hasPendingAction) {
      return ensureActiveSeat(input.round)
    }
    return input.round
  }
  return withAdvancedActive(input.round, input.originalActiveIndex)
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
 * If the current active seat is no longer active (typically because
 * they busted during a Flip Three they were the target of), rotate
 * to the next active seat.
 */
function ensureActiveSeat(round: RoundState): RoundState {
  const activeState = round.playerStates[round.activePlayerIndex]
  if (activeState === undefined || activeState.status === 'active') return round
  const next = nextActivePlayerIndex(round, round.activePlayerIndex)
  return { ...round, activePlayerIndex: next ?? round.activePlayerIndex }
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
