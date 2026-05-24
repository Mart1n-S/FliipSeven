import { describe, expect, it } from 'vitest'
import { endRound } from '@/application/use-cases/endRound'
import type { GameState } from '@/domain/entities/GameState'
import { createPlayerRoundState, type PlayerRoundState } from '@/domain/entities/PlayerRoundState'
import { createGame } from '@/domain/rules/game'
import { createCardId } from '@/domain/value-objects/CardId'
import type { GamePhase } from '@/domain/value-objects/GamePhase'
import { createPlayerId } from '@/domain/value-objects/PlayerId'

function inProgressGame(playerStates: readonly PlayerRoundState[]): GameState {
  const base = createGame(
    playerStates.map((_, i) => `P${i + 1}`),
    [],
  )
  const players = base.players.map((p, i) => ({ ...p, id: playerStates[i]!.playerId }))
  return {
    ...base,
    players,
    phase: 'in-round',
    roundNumber: 1,
    round: { playerStates: [...playerStates], activePlayerIndex: 0 },
  }
}

describe('endRound use case', () => {
  it('delegates to the domain transition (scores added, phase moves to between-rounds)', () => {
    const states: PlayerRoundState[] = [
      {
        ...createPlayerRoundState(createPlayerId('p1')),
        numberCards: [{ id: createCardId('number-7-0'), kind: 'number', value: 7 }],
        status: 'stayed',
      },
      { ...createPlayerRoundState(createPlayerId('p2')), status: 'busted' },
    ]

    const game = endRound(inProgressGame(states))

    expect(game.phase).toBe<GamePhase>('between-rounds')
    expect(game.round).toBeNull()
    expect(game.players[0]?.totalScore).toBe(7)
    expect(game.players[1]?.totalScore).toBe(0)
  })

  it('propagates the domain error when called outside `in-round`', () => {
    const base = createGame(['Alice', 'Bob'], [])

    expect(() => endRound(base)).toThrow(/Cannot end/)
  })
})
