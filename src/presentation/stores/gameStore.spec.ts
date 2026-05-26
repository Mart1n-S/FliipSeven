import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import type { GameRepository } from '@/application/ports/GameRepository'
import type { FreezeCard, NumberCard, SecondChanceCard } from '@/domain/entities/Card'
import type { GameState } from '@/domain/entities/GameState'
import type { RandomProvider } from '@/domain/ports/RandomProvider'
import { createCardId } from '@/domain/value-objects/CardId'
import { setGameStoreDeps, useGameStore } from '@/presentation/stores/gameStore'

class ZeroRandom implements RandomProvider {
  nextInt(maxExclusive: number): number {
    return 0 % maxExclusive
  }
}

class InMemoryRepository implements GameRepository {
  private snapshot: GameState | null = null

  load(): GameState | null {
    return this.snapshot
  }

  save(game: GameState): void {
    this.snapshot = game
  }

  clear(): void {
    this.snapshot = null
  }
}

let repository: InMemoryRepository

beforeEach(() => {
  setActivePinia(createPinia())
  repository = new InMemoryRepository()
  setGameStoreDeps({ random: new ZeroRandom(), repository })
})

describe('gameStore: new game', () => {
  it('starts a fresh game in `in-round` and persists it', () => {
    const store = useGameStore()
    store.newGame(['Alice', 'Bob'])

    expect(store.game?.phase).toBe('in-round')
    expect(store.game?.players).toHaveLength(2)
    expect(store.isInRound).toBe(true)
    expect(repository.load()?.players).toHaveLength(2)
  })

  it('exposes the correct phase flags', () => {
    const store = useGameStore()
    expect(store.phase).toBeNull()
    expect(store.isInRound).toBe(false)
    expect(store.isFinished).toBe(false)

    store.newGame(['Alice', 'Bob'])
    expect(store.isInRound).toBe(true)
    expect(store.isFinished).toBe(false)
  })
})

describe('gameStore: actions', () => {
  it('draw advances state and persists', () => {
    const store = useGameStore()
    store.newGame(['Alice', 'Bob'])
    const deckBefore = store.game?.deck.length ?? 0

    store.draw()

    expect(store.game?.deck.length).toBe(deckBefore - 1)
    expect(repository.load()?.deck.length).toBe(deckBefore - 1)
  })

  it('stay marks the active player as stayed and advances the turn', () => {
    const store = useGameStore()
    store.newGame(['Alice', 'Bob', 'Charlie'])
    const activeBefore = store.game?.round?.activePlayerIndex
    expect(activeBefore).not.toBeUndefined()

    store.stay()

    expect(store.game?.round?.playerStates[activeBefore as number]?.status).toBe('stayed')
    expect(store.game?.round?.activePlayerIndex).not.toBe(activeBefore)
  })

  it('auto-ends the round when nobody is active anymore', () => {
    const store = useGameStore()
    store.newGame(['Alice', 'Bob'])

    // Two players, both stay -> nobody active -> round ends automatically.
    store.stay()
    store.stay()

    expect(store.game?.phase).toBe('between-rounds')
    expect(store.game?.round).toBeNull()
  })

  it('reset wipes the in-memory state and the persisted state', () => {
    const store = useGameStore()
    store.newGame(['Alice', 'Bob'])

    store.reset()

    expect(store.game).toBeNull()
    expect(repository.load()).toBeNull()
  })

  it('throws when actions are called without an active game', () => {
    const store = useGameStore()
    expect(() => store.draw()).toThrow(/no game/)
    expect(() => store.stay()).toThrow(/no game/)
    expect(() => store.resolve(0)).toThrow(/no game/)
    expect(() => store.startNextRound()).toThrow(/no game/)
  })
})

describe('gameStore: UI hints (lastDrawnCardId, lastEvent)', () => {
  it('draw sets lastDrawnCardId to the card that was on top of the deck', () => {
    const store = useGameStore()
    store.newGame(['Alice', 'Bob'])
    const expectedId = store.game?.deck[0]?.id

    store.draw()

    expect(store.lastDrawnCardId).toBe(expectedId)
  })

  it('stay clears lastDrawnCardId', () => {
    const store = useGameStore()
    store.newGame(['Alice', 'Bob'])
    store.draw()
    expect(store.lastDrawnCardId).not.toBeNull()

    store.stay()

    expect(store.lastDrawnCardId).toBeNull()
  })

  it('auto-end of round sets lastEvent to round-ended', () => {
    const store = useGameStore()
    store.newGame(['Alice', 'Bob'])

    store.stay()
    store.stay() // both stayed -> round auto-ends

    expect(store.lastEvent).toEqual({ kind: 'round-ended', roundNumber: 1 })
  })

  it('dismissEvent clears the last event', () => {
    const store = useGameStore()
    store.newGame(['Alice', 'Bob'])
    store.stay()
    store.stay()
    expect(store.lastEvent).not.toBeNull()

    store.dismissEvent()

    expect(store.lastEvent).toBeNull()
  })

  it('newGame and reset clear both UI hints', () => {
    const store = useGameStore()
    store.newGame(['Alice', 'Bob'])
    store.draw()
    expect(store.lastDrawnCardId).not.toBeNull()

    store.reset()
    expect(store.lastDrawnCardId).toBeNull()
    expect(store.lastEvent).toBeNull()

    store.newGame(['Alice', 'Bob'])
    expect(store.lastDrawnCardId).toBeNull()
    expect(store.lastEvent).toBeNull()
  })

  it('lastRoundScores snapshots per-player round totals when a round ends', () => {
    const store = useGameStore()
    store.newGame(['Alice', 'Bob'])
    store.stay()
    store.stay() // both stayed -> round auto-ends

    expect(store.lastRoundScores).not.toBeNull()
    expect(store.lastRoundScores).toHaveLength(2)
    // Both players stayed without drawing, so their round score is 0.
    expect(store.lastRoundScores).toEqual([0, 0])
  })

  it('startNextRound clears lastRoundScores', () => {
    const store = useGameStore()
    store.newGame(['Alice', 'Bob'])
    store.stay()
    store.stay()
    expect(store.lastRoundScores).not.toBeNull()

    store.startNextRound()

    expect(store.lastRoundScores).toBeNull()
  })

  it('emits an enriched bust event carrying the duplicate card that caused the loss', () => {
    const store = useGameStore()
    store.newGame(['Alice', 'Bob'])
    const baseGame = store.game!

    const duplicate: NumberCard = {
      id: createCardId('number-7-1'),
      kind: 'number',
      value: 7,
    }
    const existing: NumberCard = {
      id: createCardId('number-7-0'),
      kind: 'number',
      value: 7,
    }

    const round = baseGame.round!
    store.$patch({
      game: {
        ...baseGame,
        deck: [duplicate, ...baseGame.deck],
        dealQueue: null,
        round: {
          ...round,
          activePlayerIndex: 0,
          playerStates: round.playerStates.map((s, i) =>
            i === 0 ? { ...s, numberCards: [existing] } : s,
          ),
        },
      },
    })

    store.draw()

    expect(store.lastEvent).toMatchObject({
      kind: 'bust',
      playerIndex: 0,
      duplicateCard: { id: duplicate.id, value: 7 },
    })
    expect(store.game?.round?.playerStates[0]?.status).toBe('busted')
  })

  it('emits an action-drawn event when an Action card is pulled (visible even on auto-resolve)', () => {
    const store = useGameStore()
    store.newGame(['Alice', 'Bob'])
    const baseGame = store.game!

    const freeze: FreezeCard = {
      id: createCardId('action-freeze-test'),
      kind: 'action',
      action: 'freeze',
    }

    const round = baseGame.round!
    store.$patch({
      game: {
        ...baseGame,
        deck: [freeze, ...baseGame.deck],
        dealQueue: null,
        round: { ...round, activePlayerIndex: 0 },
      },
    })

    store.draw()

    expect(store.lastEvent).toMatchObject({
      kind: 'action-drawn',
      playerIndex: 0,
      card: { id: freeze.id, action: 'freeze' },
    })
  })

  it('emits a second-chance-save event with both cards when SC neutralises a duplicate', () => {
    const store = useGameStore()
    store.newGame(['Alice', 'Bob'])
    const baseGame = store.game!

    const duplicate: NumberCard = {
      id: createCardId('number-5-1'),
      kind: 'number',
      value: 5,
    }
    const existing: NumberCard = {
      id: createCardId('number-5-0'),
      kind: 'number',
      value: 5,
    }
    const sc: SecondChanceCard = {
      id: createCardId('action-second-chance-test'),
      kind: 'action',
      action: 'second-chance',
    }

    // Patch the game directly: P1 holds SC and a 5; the top of the deck
    // is another 5; deal phase is done; P1 is active.
    const round = baseGame.round!
    store.$patch({
      game: {
        ...baseGame,
        deck: [duplicate, ...baseGame.deck],
        dealQueue: null,
        round: {
          ...round,
          activePlayerIndex: 0,
          playerStates: round.playerStates.map((s, i) =>
            i === 0 ? { ...s, numberCards: [existing], secondChance: sc } : s,
          ),
        },
      },
    })

    store.draw()

    expect(store.lastEvent).toMatchObject({
      kind: 'second-chance-save',
      playerIndex: 0,
      duplicateCard: { id: duplicate.id, value: 5 },
      secondChanceCard: { id: sc.id },
    })
    // P1's row stays with 1 number card (the duplicate goes to the discard
    // alongside the SC).
    expect(store.game?.round?.playerStates[0]?.numberCards).toHaveLength(1)
    expect(store.game?.round?.playerStates[0]?.secondChance).toBeNull()
  })
})

describe('gameStore: persistence', () => {
  it('loadFromStorage returns false when nothing was persisted', () => {
    const store = useGameStore()
    expect(store.loadFromStorage()).toBe(false)
    expect(store.game).toBeNull()
  })

  it('loadFromStorage restores the previously persisted game', () => {
    const seed = useGameStore()
    seed.newGame(['Alice', 'Bob'])
    const snapshot = seed.game

    // Fresh Pinia instance to simulate a reload.
    setActivePinia(createPinia())
    const reloaded = useGameStore()
    expect(reloaded.loadFromStorage()).toBe(true)
    expect(reloaded.game).toEqual(snapshot)
  })
})
