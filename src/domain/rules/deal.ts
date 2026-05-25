import type { GameState } from '@/domain/entities/GameState'

/**
 * Advance the initial-deal queue when the current dealee's action
 * chain is fully settled (no pending action, no forced draws).
 *
 * - Pops the current head of `dealQueue` (the dealee whose turn just
 *   completed).
 * - Skips any subsequent head that is no longer `active` (eg. they were
 *   frozen earlier in the deal).
 * - When the queue is drained, transitions to the play phase by setting
 *   `dealQueue` to `null` and pointing `activePlayerIndex` at the first
 *   active seat starting from the dealer's left.
 *
 * Idempotent: returns the same game if there is nothing to do.
 */
export function advanceDealQueueIfIdle(game: GameState): GameState {
  if (game.dealQueue === null) return game
  if (game.pendingAction !== null) return game
  if (game.forcedDraws !== null) return game
  if (game.round === null) return game

  // Pop the head (current dealee just finished). Then skip any
  // subsequent player who is no longer active.
  let queue: readonly number[] = game.dealQueue.slice(1)
  while (queue.length > 0) {
    const head = queue[0] as number
    if (game.round.playerStates[head]?.status === 'active') break
    queue = queue.slice(1)
  }

  if (queue.length > 0) {
    return { ...game, dealQueue: queue }
  }

  // Deal phase done -> transition to play phase. Make sure
  // activePlayerIndex points at an active seat (skipping any player
  // who got frozen / busted during the deal).
  const n = game.players.length
  const startSeat = (game.dealerIndex + 1) % n
  for (let i = 0; i < n; i += 1) {
    const idx = (startSeat + i) % n
    if (game.round.playerStates[idx]?.status === 'active') {
      return {
        ...game,
        dealQueue: null,
        round: { ...game.round, activePlayerIndex: idx },
      }
    }
  }

  // No active player at all - keep activePlayerIndex untouched, the
  // caller (store) will detect the round-end condition via
  // shouldEndRound.
  return { ...game, dealQueue: null }
}
