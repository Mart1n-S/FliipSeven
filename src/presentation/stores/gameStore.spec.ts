import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import type { GameRepository } from '@/application/ports/GameRepository'
import type { GameState } from '@/domain/entities/GameState'
import type { RandomProvider } from '@/domain/ports/RandomProvider'
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
