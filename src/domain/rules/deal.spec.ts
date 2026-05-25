import { describe, expect, it } from 'vitest'
import type { GameState } from '@/domain/entities/GameState'
import { createPlayerRoundState, type PlayerRoundState } from '@/domain/entities/PlayerRoundState'
import { advanceDealQueueIfIdle } from '@/domain/rules/deal'
import { createGame } from '@/domain/rules/game'
import { createPlayerId } from '@/domain/value-objects/PlayerId'
import type { PlayerStatus } from '@/domain/value-objects/PlayerStatus'

function gameWith(
  statuses: readonly PlayerStatus[],
  options: { dealQueue?: readonly number[] | null; dealerIndex?: number } = {},
): GameState {
  const base = createGame(
    statuses.map((_, i) => `P${i + 1}`),
    [],
  )
  const playerStates: PlayerRoundState[] = statuses.map((status, i) => ({
    ...createPlayerRoundState(createPlayerId(`p${i + 1}`)),
    status,
  }))
  const players = base.players.map((p, i) => ({ ...p, id: playerStates[i]!.playerId }))
  return {
    ...base,
    players,
    phase: 'in-round',
    roundNumber: 1,
    round: { playerStates, activePlayerIndex: 0 },
    dealQueue: options.dealQueue === undefined ? [0, 1, 2] : options.dealQueue,
    dealerIndex: options.dealerIndex ?? 0,
  }
}

describe('advanceDealQueueIfIdle', () => {
  it('returns the game unchanged when dealQueue is null', () => {
    const game = gameWith(['active', 'active'], { dealQueue: null })
    expect(advanceDealQueueIfIdle(game)).toBe(game)
  })

  it('returns the game unchanged when a pending action is set', () => {
    const game: GameState = {
      ...gameWith(['active', 'active', 'active']),
      pendingAction: {
        card: {
          id: 'action-freeze-0' as never,
          kind: 'action',
          action: 'freeze',
        },
        originIndex: 0,
      },
    }
    expect(advanceDealQueueIfIdle(game)).toBe(game)
  })

  it('returns the game unchanged when forced draws are active', () => {
    const game: GameState = {
      ...gameWith(['active', 'active', 'active']),
      forcedDraws: { targetIndex: 1, remaining: 2 },
    }
    expect(advanceDealQueueIfIdle(game)).toBe(game)
  })

  it('pops the head when idle and keeps the rest of the queue', () => {
    const game = gameWith(['active', 'active', 'active'], { dealQueue: [0, 1, 2] })
    const next = advanceDealQueueIfIdle(game)
    expect(next.dealQueue).toEqual([1, 2])
  })

  it('skips subsequent heads that are no longer active', () => {
    const game = gameWith(['active', 'frozen', 'busted', 'active'], {
      dealQueue: [0, 1, 2, 3],
    })
    const next = advanceDealQueueIfIdle(game)
    expect(next.dealQueue).toEqual([3])
  })

  it('clears the queue and lands activePlayerIndex on the first active seat after the dealer', () => {
    const game = gameWith(['active', 'frozen', 'active'], {
      dealQueue: [0],
      dealerIndex: 0,
    })
    const next = advanceDealQueueIfIdle(game)
    expect(next.dealQueue).toBeNull()
    // Dealer = 0, so first seat to check is 1 (frozen, skip) then 2 (active).
    expect(next.round?.activePlayerIndex).toBe(2)
  })

  it('clears the queue when nobody is active anymore', () => {
    const game = gameWith(['frozen', 'busted'], { dealQueue: [0] })
    const next = advanceDealQueueIfIdle(game)
    expect(next.dealQueue).toBeNull()
  })
})
