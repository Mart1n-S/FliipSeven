import { describe, expect, it } from 'vitest'
import { drawCard } from '@/application/use-cases/drawCard'
import type {
  Card,
  FlipThreeCard,
  FreezeCard,
  ModifierCard,
  NumberCard,
  SecondChanceCard,
} from '@/domain/entities/Card'
import type { GameState } from '@/domain/entities/GameState'
import { createPlayerRoundState, type PlayerRoundState } from '@/domain/entities/PlayerRoundState'
import type { RandomProvider } from '@/domain/ports/RandomProvider'
import { createGame } from '@/domain/rules/game'
import { createCardId } from '@/domain/value-objects/CardId'
import type { ModifierKind } from '@/domain/value-objects/ModifierKind'
import type { NumberValue } from '@/domain/value-objects/NumberValue'
import { createPlayerId } from '@/domain/value-objects/PlayerId'
import type { PlayerStatus } from '@/domain/value-objects/PlayerStatus'

// ---------- helpers ----------

class ZeroRandom implements RandomProvider {
  nextInt(maxExclusive: number): number {
    return 0 % maxExclusive
  }
}

function makeNumber(value: NumberValue, index = 0): NumberCard {
  return { id: createCardId(`number-${value}-${index}`), kind: 'number', value }
}

function makeModifier(modifier: ModifierKind): ModifierCard {
  return { id: createCardId(`modifier-${modifier}`), kind: 'modifier', modifier }
}

function makeFreeze(index = 0): FreezeCard {
  return { id: createCardId(`action-freeze-${index}`), kind: 'action', action: 'freeze' }
}

function makeFlipThree(index = 0): FlipThreeCard {
  return {
    id: createCardId(`action-flip-three-${index}`),
    kind: 'action',
    action: 'flip-three',
  }
}

function makeSC(index = 0): SecondChanceCard {
  return {
    id: createCardId(`action-second-chance-${index}`),
    kind: 'action',
    action: 'second-chance',
  }
}

function inProgressGame(
  statuses: readonly PlayerStatus[],
  deck: readonly Card[],
  options: {
    activePlayerIndex?: number
    playerStateOverrides?: Partial<PlayerRoundState>[]
  } = {},
): GameState {
  const pseudos = statuses.map((_, i) => `P${i + 1}`)
  const base = createGame(pseudos, deck)
  const playerStates: PlayerRoundState[] = statuses.map((status, i) => ({
    ...createPlayerRoundState(createPlayerId(`p${i + 1}`)),
    status,
    ...(options.playerStateOverrides?.[i] ?? {}),
  }))
  const players = base.players.map((p, i) => ({ ...p, id: playerStates[i]!.playerId }))
  return {
    ...base,
    players,
    phase: 'in-round',
    roundNumber: 1,
    round: {
      playerStates,
      activePlayerIndex: options.activePlayerIndex ?? 0,
    },
  }
}

const deps = { random: new ZeroRandom() }

// ---------- happy paths ----------

describe('drawCard: number / modifier draws', () => {
  it('adds a number card to the active player and keeps them active', () => {
    const game = inProgressGame(['active', 'active'], [makeNumber(7)])
    const next = drawCard(deps, game)

    expect(next.round?.playerStates[0]?.numberCards).toHaveLength(1)
    expect(next.round?.playerStates[0]?.status).toBe<PlayerStatus>('active')
    expect(next.round?.activePlayerIndex).toBe(0) // still their turn (they can hit again or stay)
    expect(next.deck).toHaveLength(0)
  })

  it('adds a modifier card to the active player', () => {
    const game = inProgressGame(['active', 'active'], [makeModifier('plus-4')])
    const next = drawCard(deps, game)

    expect(next.round?.playerStates[0]?.modifiers).toHaveLength(1)
    expect(next.round?.playerStates[0]?.status).toBe<PlayerStatus>('active')
  })
})

describe('drawCard: bust handling', () => {
  it('marks the active player as busted on a duplicate and advances the turn', () => {
    const game = inProgressGame(['active', 'active', 'active'], [makeNumber(5, 1)], {
      playerStateOverrides: [{ numberCards: [makeNumber(5, 0)] }],
    })
    const next = drawCard(deps, game)

    expect(next.round?.playerStates[0]?.status).toBe<PlayerStatus>('busted')
    expect(next.round?.activePlayerIndex).toBe(1)
  })

  it('lets Second Chance neutralise the duplicate (player stays active)', () => {
    const sc = makeSC()
    const duplicate = makeNumber(5, 1)
    const game = inProgressGame(['active', 'active'], [duplicate], {
      playerStateOverrides: [{ numberCards: [makeNumber(5, 0)], secondChance: sc }],
    })
    const next = drawCard(deps, game)

    expect(next.round?.playerStates[0]?.status).toBe<PlayerStatus>('active')
    expect(next.round?.playerStates[0]?.secondChance).toBeNull()
    expect(next.discard).toEqual([duplicate, sc])
  })

  it('flips to flip7 when the 7th unique number lands', () => {
    const six: NumberCard[] = [1, 2, 3, 4, 5, 6].map((v) => makeNumber(v as NumberValue))
    const game = inProgressGame(['active', 'active'], [makeNumber(7)], {
      playerStateOverrides: [{ numberCards: six }],
    })
    const next = drawCard(deps, game)

    expect(next.round?.playerStates[0]?.status).toBe<PlayerStatus>('flip7')
  })
})

// ---------- action cards (idle context) ----------

describe('drawCard: action cards (no forced draws)', () => {
  it('sets pendingAction when an action card is drawn', () => {
    const freeze = makeFreeze()
    const game = inProgressGame(['active', 'active'], [freeze])
    const next = drawCard(deps, game)

    expect(next.pendingAction).toEqual({ card: freeze, originIndex: 0 })
    expect(next.actionQueue).toEqual([])
  })

  it('does not consume an extra card or change row contents', () => {
    const game = inProgressGame(['active', 'active'], [makeFlipThree(), makeNumber(5)])
    const next = drawCard(deps, game)

    expect(next.deck).toHaveLength(1)
    expect(next.round?.playerStates[0]?.numberCards).toEqual([])
  })
})

// ---------- forced draws (Flip Three sequence) ----------

describe('drawCard: forced draws (Flip Three)', () => {
  function forcedGame(
    statuses: readonly PlayerStatus[],
    deck: readonly Card[],
    forcedRemaining: number,
    forcedTargetIndex: number,
    activePlayerIndex = 0,
    playerStateOverrides: Partial<PlayerRoundState>[] = [],
  ): GameState {
    const game = inProgressGame(statuses, deck, {
      activePlayerIndex,
      playerStateOverrides,
    })
    return {
      ...game,
      forcedDraws: { targetIndex: forcedTargetIndex, remaining: forcedRemaining },
    }
  }

  it('targets the forced player, not the active one', () => {
    const game = forcedGame(['active', 'active'], [makeNumber(7)], 3, 1, 0)
    const next = drawCard(deps, game)

    expect(next.round?.playerStates[1]?.numberCards).toHaveLength(1)
    expect(next.round?.playerStates[0]?.numberCards).toEqual([])
  })

  it('decrements `remaining` after each draw', () => {
    const game = forcedGame(['active', 'active'], [makeNumber(7)], 3, 1)
    const next = drawCard(deps, game)

    expect(next.forcedDraws).toEqual({ targetIndex: 1, remaining: 2 })
  })

  it('clears forcedDraws once `remaining` reaches 0', () => {
    const game = forcedGame(['active', 'active'], [makeNumber(7)], 1, 1)
    const next = drawCard(deps, game)

    expect(next.forcedDraws).toBeNull()
  })

  it('clears forcedDraws as soon as the target busts', () => {
    const game = forcedGame(['active', 'active'], [makeNumber(5, 1)], 3, 1, 0, [
      {},
      { numberCards: [makeNumber(5, 0)] },
    ])
    const next = drawCard(deps, game)

    expect(next.forcedDraws).toBeNull()
    expect(next.round?.playerStates[1]?.status).toBe<PlayerStatus>('busted')
  })

  it('queues action cards drawn during the sequence (does not set pendingAction)', () => {
    const freeze = makeFreeze()
    const game = forcedGame(['active', 'active'], [freeze], 3, 1)
    const next = drawCard(deps, game)

    expect(next.pendingAction).toBeNull()
    expect(next.actionQueue).toEqual([freeze])
  })

  it('drains the queue into pendingAction when forcedDraws end with queued actions', () => {
    const freeze = makeFreeze()
    const game: GameState = {
      ...forcedGame(['active', 'active'], [makeNumber(7)], 1, 1),
      actionQueue: [freeze],
    }
    const next = drawCard(deps, game)

    expect(next.forcedDraws).toBeNull()
    expect(next.pendingAction).toEqual({ card: freeze, originIndex: 1 })
    expect(next.actionQueue).toEqual([])
  })

  it('does not advance the active seat when the forced target (not the active) busts', () => {
    const game = forcedGame(['active', 'active'], [makeNumber(5, 1)], 3, 1, 0, [
      {},
      { numberCards: [makeNumber(5, 0)] },
    ])
    const next = drawCard(deps, game)

    expect(next.round?.activePlayerIndex).toBe(0)
  })
})

// ---------- deck reshuffle ----------

describe('drawCard: deck reshuffle', () => {
  it('reshuffles the discard pile into the deck when empty', () => {
    const game: GameState = {
      ...inProgressGame(['active', 'active'], []),
      discard: [makeNumber(7), makeNumber(3)],
    }
    const next = drawCard(deps, game)

    expect(next.deck).toHaveLength(1) // 2 from discard, 1 drawn immediately
    expect(next.discard).toEqual([])
    expect(next.round?.playerStates[0]?.numberCards).toHaveLength(1)
  })

  it('throws when both deck and discard are empty', () => {
    const game = inProgressGame(['active', 'active'], [])
    expect(() => drawCard(deps, game)).toThrow(/empty/)
  })
})

// ---------- error cases ----------

describe('drawCard: error cases', () => {
  it('throws when called with a pending action still set', () => {
    const game: GameState = {
      ...inProgressGame(['active', 'active'], [makeNumber(7)]),
      pendingAction: { card: makeFreeze(), originIndex: 0 },
    }
    expect(() => drawCard(deps, game)).toThrow(/pending action/)
  })

  it('throws when the target seat is not active', () => {
    const game = inProgressGame(['busted', 'active'], [makeNumber(7)], {
      activePlayerIndex: 0,
    })
    expect(() => drawCard(deps, game)).toThrow(/not active/)
  })

  it('throws when not in a round', () => {
    const base = createGame(['Alice', 'Bob'], [makeNumber(7)])
    expect(() => drawCard(deps, base)).toThrow(/not in a round/)
  })
})
