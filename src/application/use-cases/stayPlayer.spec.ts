import { describe, expect, it } from 'vitest'
import { stayPlayer } from '@/application/use-cases/stayPlayer'
import type { GameState } from '@/domain/entities/GameState'
import { createPlayerRoundState, type PlayerRoundState } from '@/domain/entities/PlayerRoundState'
import { createGame } from '@/domain/rules/game'
import type { GamePhase } from '@/domain/value-objects/GamePhase'
import { createPlayerId } from '@/domain/value-objects/PlayerId'
import type { PlayerStatus } from '@/domain/value-objects/PlayerStatus'

function inProgressGame(statuses: readonly PlayerStatus[], activePlayerIndex = 0): GameState {
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
    round: { playerStates, activePlayerIndex },
  }
}

describe('stayPlayer use case', () => {
  it('marks the active player as stayed', () => {
    const game = stayPlayer(inProgressGame(['active', 'active', 'active'], 1))

    expect(game.round?.playerStates[1]?.status).toBe<PlayerStatus>('stayed')
  })

  it('advances activePlayerIndex to the next active seat', () => {
    const game = stayPlayer(inProgressGame(['active', 'active', 'active'], 1))

    expect(game.round?.activePlayerIndex).toBe(2)
  })

  it('skips non-active seats when advancing', () => {
    const game = stayPlayer(inProgressGame(['active', 'active', 'frozen', 'active'], 1))

    expect(game.round?.activePlayerIndex).toBe(3)
  })

  it('keeps activePlayerIndex unchanged when no other active player remains', () => {
    const game = stayPlayer(inProgressGame(['active', 'busted', 'frozen'], 0))

    expect(game.round?.playerStates[0]?.status).toBe<PlayerStatus>('stayed')
    // 0 was the only active; after staying, no one else is active.
    expect(game.round?.activePlayerIndex).toBe(0)
  })

  it('throws if the game is not in a round', () => {
    const base = createGame(['Alice', 'Bob'], [])

    expect(() => stayPlayer(base)).toThrow(/not in a round/)
  })

  it.each<PlayerStatus>(['stayed', 'busted', 'frozen', 'flip7'])(
    'throws when the current seat has status %s',
    (status) => {
      const game = inProgressGame([status, 'active'], 0)

      expect(() => stayPlayer(game)).toThrow(/not active/)
    },
  )

  it('does not mutate the input game', () => {
    const game = inProgressGame(['active', 'active'], 0)
    const snapshot = structuredClone(game)

    stayPlayer(game)

    expect(game).toEqual(snapshot)
  })

  it.each<GamePhase>(['setup', 'between-rounds', 'finished'])(
    'throws when phase is %s',
    (phase) => {
      const base = createGame(['Alice', 'Bob'], [])
      expect(() => stayPlayer({ ...base, phase })).toThrow(/not in a round/)
    },
  )
})
