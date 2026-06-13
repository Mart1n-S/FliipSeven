import { describe, expect, it } from 'vitest'
import type {
  FlipThreeCard,
  FreezeCard,
  ModifierCard,
  NumberCard,
  SecondChanceCard,
} from '@/domain/entities/Card'
import type { GameState } from '@/domain/entities/GameState'
import { createPlayerRoundState, type PlayerRoundState } from '@/domain/entities/PlayerRoundState'
import { createGame, WIN_THRESHOLD } from '@/domain/rules/game'
import { endRound, startRound } from '@/domain/rules/round'
import { createCardId } from '@/domain/value-objects/CardId'
import type { GamePhase } from '@/domain/value-objects/GamePhase'
import type { ModifierKind } from '@/domain/value-objects/ModifierKind'
import type { NumberValue } from '@/domain/value-objects/NumberValue'
import { createPlayerId } from '@/domain/value-objects/PlayerId'

// ---------- helpers ----------

function makeNumber(value: NumberValue, index = 0): NumberCard {
  return { id: createCardId(`number-${value}-${index}`), kind: 'number', value }
}

function makeModifier(modifier: ModifierKind): ModifierCard {
  return { id: createCardId(`modifier-${modifier}`), kind: 'modifier', modifier }
}

function makeSC(index = 0): SecondChanceCard {
  return {
    id: createCardId(`action-second-chance-${index}`),
    kind: 'action',
    action: 'second-chance',
  }
}

function makeFreeze(index = 0): FreezeCard {
  return { id: createCardId(`action-freeze-${index}`), kind: 'action', action: 'freeze' }
}

function makeFlipThree(index = 0): FlipThreeCard {
  return { id: createCardId(`action-flip-three-${index}`), kind: 'action', action: 'flip-three' }
}

function freshGame(pseudos = ['Alice', 'Bob', 'Charlie']): GameState {
  return createGame(pseudos, [])
}

function inProgressGame(playerStates: readonly PlayerRoundState[]): GameState {
  const base = createGame(
    playerStates.map((_, i) => `P${i + 1}`),
    [],
  )
  // Align Player ids on PlayerRoundState ids so endRound can score correctly.
  const players = base.players.map((p, i) => ({ ...p, id: playerStates[i]!.playerId }))
  return {
    ...base,
    players,
    phase: 'in-round',
    roundNumber: 1,
    round: { playerStates: [...playerStates], activePlayerIndex: 0 },
  }
}

// ---------- startRound ----------

describe('startRound', () => {
  it('creates a fresh round from `setup`', () => {
    const game = startRound(freshGame())

    expect(game.phase).toBe<GamePhase>('in-round')
    expect(game.roundNumber).toBe(1)
    expect(game.round).not.toBeNull()
    expect(game.round?.playerStates).toHaveLength(3)
    expect(game.round?.playerStates.every((s) => s.status === 'active')).toBe(true)
  })

  it('starts play at the seat to the left of the dealer', () => {
    const base: GameState = { ...freshGame(), dealerIndex: 1 }
    const game = startRound(base)

    expect(game.round?.activePlayerIndex).toBe(2)
  })

  it('wraps around when the dealer is the last seat', () => {
    const base: GameState = { ...freshGame(), dealerIndex: 2 }
    const game = startRound(base)

    expect(game.round?.activePlayerIndex).toBe(0)
  })

  it('also works from `between-rounds` and increments the round counter', () => {
    const between: GameState = {
      ...freshGame(),
      phase: 'between-rounds',
      roundNumber: 3,
    }
    const game = startRound(between)

    expect(game.roundNumber).toBe(4)
    expect(game.phase).toBe<GamePhase>('in-round')
  })

  it.each<GamePhase>(['in-round', 'finished'])('throws from phase %s', (phase) => {
    expect(() => startRound({ ...freshGame(), phase })).toThrow(/Cannot start/)
  })
})

// ---------- endRound ----------

describe('endRound', () => {
  it('adds each player round score to their total score', () => {
    const states: PlayerRoundState[] = [
      {
        ...createPlayerRoundState(createPlayerId('p1')),
        numberCards: [makeNumber(7)],
        status: 'stayed',
      },
      {
        ...createPlayerRoundState(createPlayerId('p2')),
        numberCards: [makeNumber(5)],
        modifiers: [makeModifier('plus-4')],
        status: 'stayed',
      },
      { ...createPlayerRoundState(createPlayerId('p3')), status: 'busted' },
    ]

    const game = endRound(inProgressGame(states))

    expect(game.players[0]?.totalScore).toBe(7)
    expect(game.players[1]?.totalScore).toBe(9)
    expect(game.players[2]?.totalScore).toBe(0)
  })

  it('moves every card from every row to the discard pile', () => {
    const sc = makeSC()
    const states: PlayerRoundState[] = [
      {
        ...createPlayerRoundState(createPlayerId('p1')),
        numberCards: [makeNumber(5), makeNumber(7)],
        modifiers: [makeModifier('plus-2')],
        secondChance: sc,
        status: 'stayed',
      },
      {
        ...createPlayerRoundState(createPlayerId('p2')),
        numberCards: [makeNumber(11)],
        status: 'busted',
      },
    ]

    const game = endRound(inProgressGame(states))

    expect(game.discard).toHaveLength(5) // 2 numbers + 1 mod + 1 SC + 1 number (busted)
    expect(game.discard).toContain(sc)
    expect(game.round).toBeNull()
  })

  it('returns an in-flight pending action card to the discard pile', () => {
    // Regression: when a round ends while an action card is still
    // awaiting resolution, the card must not vanish from the game.
    const pending = makeFreeze()
    const states: PlayerRoundState[] = [
      { ...createPlayerRoundState(createPlayerId('p1')), status: 'busted' },
      { ...createPlayerRoundState(createPlayerId('p2')), status: 'stayed' },
    ]
    const base = inProgressGame(states)
    const game = endRound({ ...base, pendingAction: { card: pending, originIndex: 0 } })

    expect(game.discard).toContain(pending)
    expect(game.pendingAction).toBeNull()
  })

  it('returns queued action cards to the discard pile', () => {
    // Regression: action cards queued during a Flip Three that is cut
    // short (eg. Flip 7 on the last forced draw) must be conserved.
    const queued1 = makeFreeze(1)
    const queued2 = makeFlipThree(1)
    const states: PlayerRoundState[] = [
      {
        ...createPlayerRoundState(createPlayerId('p1')),
        numberCards: Array.from({ length: 7 }, (_, i) => makeNumber((i + 1) as NumberValue, i)),
        status: 'flip7',
      },
      { ...createPlayerRoundState(createPlayerId('p2')), status: 'busted' },
    ]
    const base = inProgressGame(states)
    const game = endRound({
      ...base,
      actionQueue: [
        { card: queued1, originIndex: 0 },
        { card: queued2, originIndex: 0 },
      ],
    })

    expect(game.discard).toContain(queued1)
    expect(game.discard).toContain(queued2)
    expect(game.actionQueue).toEqual([])
  })

  it('switches to `between-rounds` and rotates the dealer when nobody won', () => {
    const states: PlayerRoundState[] = [
      {
        ...createPlayerRoundState(createPlayerId('p1')),
        numberCards: [makeNumber(7)],
        status: 'stayed',
      },
      { ...createPlayerRoundState(createPlayerId('p2')), status: 'busted' },
    ]

    const game = endRound(inProgressGame(states))

    expect(game.phase).toBe<GamePhase>('between-rounds')
    expect(game.dealerIndex).toBe(1)
  })

  it('rotates dealer modulo the player count', () => {
    const states: PlayerRoundState[] = [
      { ...createPlayerRoundState(createPlayerId('p1')), status: 'stayed' },
      { ...createPlayerRoundState(createPlayerId('p2')), status: 'stayed' },
    ]
    const base = inProgressGame(states)
    const game = endRound({ ...base, dealerIndex: 1 })

    expect(game.dealerIndex).toBe(0)
  })

  it('switches to `finished` when at least one player crosses the win threshold', () => {
    const states: PlayerRoundState[] = [
      {
        ...createPlayerRoundState(createPlayerId('p1')),
        numberCards: Array.from({ length: 7 }, (_, i) => makeNumber((i + 1) as NumberValue, i)),
        status: 'flip7',
      },
      { ...createPlayerRoundState(createPlayerId('p2')), status: 'busted' },
    ]
    const base = inProgressGame(states)
    const seeded: GameState = {
      ...base,
      players: base.players.map((p, i) => (i === 0 ? { ...p, totalScore: WIN_THRESHOLD - 10 } : p)),
    }

    const game = endRound(seeded)

    expect(game.phase).toBe<GamePhase>('finished')
    expect(game.players[0]?.totalScore).toBeGreaterThanOrEqual(WIN_THRESHOLD)
  })

  it('does not rotate the dealer when the game ends', () => {
    const states: PlayerRoundState[] = [
      {
        ...createPlayerRoundState(createPlayerId('p1')),
        numberCards: [makeNumber(12)],
        status: 'stayed',
      },
      { ...createPlayerRoundState(createPlayerId('p2')), status: 'busted' },
    ]
    const base = inProgressGame(states)
    const seeded: GameState = {
      ...base,
      dealerIndex: 0,
      players: base.players.map((p, i) => (i === 0 ? { ...p, totalScore: WIN_THRESHOLD - 1 } : p)),
    }

    const game = endRound(seeded)

    expect(game.phase).toBe<GamePhase>('finished')
    expect(game.dealerIndex).toBe(0)
  })

  it.each<GamePhase>(['setup', 'between-rounds', 'finished'])('throws from phase %s', (phase) => {
    const base = freshGame()
    expect(() => endRound({ ...base, phase })).toThrow(/Cannot end/)
  })
})
