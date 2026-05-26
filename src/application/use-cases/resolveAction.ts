import type { Card, FreezeCard } from '@/domain/entities/Card'
import {
  isFlipThreeCard,
  isFreezeCard,
  isSecondChanceCard,
  type FlipThreeCard,
  type SecondChanceCard,
} from '@/domain/entities/Card'
import type {
  GameState,
  PendingActionContext,
  QueuedAction,
} from '@/domain/entities/GameState'
import { nextActivePlayerIndex, type RoundState } from '@/domain/entities/RoundState'
import { applyFlipThree } from '@/domain/rules/actions/flipThree'
import { applyFreeze } from '@/domain/rules/actions/freeze'
import { placeSecondChance } from '@/domain/rules/actions/secondChance'
import { advanceDealQueueIfIdle } from '@/domain/rules/deal'

/**
 * Resolve the action stored in `game.pendingAction` against the
 * target chosen by the origin player.
 *
 * Target rules (caller must respect them - the function will throw
 * otherwise):
 *  - Freeze       : `targetIndex` must point to an active player.
 *  - Flip Three   : `targetIndex` must point to an active player.
 *  - Second Chance:
 *      - `targetIndex` is an active player without a SC slot already
 *        filled, OR
 *      - `targetIndex === null` to discard the card (no valid recipient).
 *
 * After applying the effect, the next queued action card (if any)
 * is promoted to `pendingAction`. When the queue drains and the active
 * seat is no longer active, the turn is handed over to the next
 * active seat.
 *
 * @throws if `pendingAction` is null, the phase is wrong, or the
 *         target choice is invalid.
 */
export function resolveAction(game: GameState, targetIndex: number | null): GameState {
  if (game.phase !== 'in-round' || game.round === null) {
    throw new Error(`resolveAction: game is not in a round (phase=${game.phase}).`)
  }
  if (game.pendingAction === null) {
    throw new Error('resolveAction: no pending action to resolve.')
  }

  const round = game.round
  const pending = game.pendingAction
  const card = pending.card

  let newPlayerStates = round.playerStates
  let newDiscard: readonly Card[] = game.discard
  let newForcedDraws = game.forcedDraws

  if (isFreezeCard(card)) {
    const target = requireActiveTarget(round, targetIndex, 'Freeze')
    const outcome = applyFreeze(target, card as FreezeCard)
    newPlayerStates = replaceAt(newPlayerStates, targetIndex as number, outcome.state)
    newDiscard = [...newDiscard, ...outcome.discarded]
  } else if (isFlipThreeCard(card)) {
    const target = requireActiveTarget(round, targetIndex, 'Flip Three')
    const outcome = applyFlipThree(target, card as FlipThreeCard)
    newDiscard = [...newDiscard, ...outcome.discarded]
    newForcedDraws = {
      targetIndex: targetIndex as number,
      remaining: outcome.drawsOwed,
    }
    // `target` returned unchanged by applyFlipThree -> no state replacement needed.
    void target
  } else if (isSecondChanceCard(card)) {
    if (targetIndex === null) {
      // No valid recipient available -> discard.
      newDiscard = [...newDiscard, card]
    } else {
      const target = requireActiveTarget(round, targetIndex, 'Second Chance')
      const updated = placeSecondChance(target, card as SecondChanceCard)
      newPlayerStates = replaceAt(newPlayerStates, targetIndex, updated)
    }
  }

  // Drain one queued action into the next pendingAction (if any).
  //
  // Two important subtleties here:
  //  1. We do NOT drain while `newForcedDraws` is non-null - a Flip
  //     Three we just resolved is about to start a sub-sequence, and
  //     subsequent queued actions must wait for that sub-sequence to
  //     end. Otherwise a second Flip Three in the queue would overwrite
  //     the first sub-sequence's target.
  //  2. Each queued action carries its own `originIndex` (snapshot of
  //     who produced it). We use THAT, not `pending.originIndex`, so a
  //     Freeze queued during P2's sequence is still resolved by P2
  //     even if a sub-sequence on X ran in between.
  let newPendingAction: PendingActionContext | null = null
  let newActionQueue: readonly QueuedAction[] = game.actionQueue
  if (newForcedDraws === null && newActionQueue.length > 0) {
    const head = newActionQueue[0] as QueuedAction
    newPendingAction = { card: head.card, originIndex: head.originIndex }
    newActionQueue = newActionQueue.slice(1)
  }

  const intermediate: RoundState = { ...round, playerStates: newPlayerStates }
  const newRound = withAdvancedActiveIfIdle(intermediate, newPendingAction, newForcedDraws)

  const intermediateGame: GameState = {
    ...game,
    discard: newDiscard,
    round: newRound,
    pendingAction: newPendingAction,
    actionQueue: newActionQueue,
    forcedDraws: newForcedDraws,
  }

  // If the resolved action belonged to a deal-phase dealee and the
  // chain is now fully settled, advance the deal queue.
  return advanceDealQueueIfIdle(intermediateGame)
}

function requireActiveTarget(round: RoundState, targetIndex: number | null, cardName: string) {
  if (targetIndex === null) {
    throw new Error(`resolveAction: ${cardName} requires a target.`)
  }
  const target = round.playerStates[targetIndex]
  if (target === undefined) {
    throw new Error(`resolveAction: invalid target index ${targetIndex}.`)
  }
  if (target.status !== 'active') {
    throw new Error(`resolveAction: ${cardName} target must be active (got ${target.status}).`)
  }
  return target
}

function replaceAt<T>(items: readonly T[], index: number, value: T): T[] {
  return items.map((item, i) => (i === index ? value : item))
}

function withAdvancedActiveIfIdle(
  round: RoundState,
  pendingAction: PendingActionContext | null,
  forcedDraws: GameState['forcedDraws'],
): RoundState {
  if (pendingAction !== null) return round
  if (forcedDraws !== null) return round
  const activeIdx = round.activePlayerIndex
  const activeState = round.playerStates[activeIdx]
  if (activeState === undefined || activeState.status === 'active') return round
  const next = nextActivePlayerIndex(round, activeIdx)
  return { ...round, activePlayerIndex: next ?? activeIdx }
}
