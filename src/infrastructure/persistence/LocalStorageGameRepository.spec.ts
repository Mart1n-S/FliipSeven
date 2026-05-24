import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_STORAGE_KEY,
  LocalStorageGameRepository,
} from '@/infrastructure/persistence/LocalStorageGameRepository'
import { createGame } from '@/domain/rules/game'
import { startRound } from '@/domain/rules/round'

function freshGame() {
  return startRound(createGame(['Alice', 'Bob'], []))
}

describe('LocalStorageGameRepository', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns null when nothing has been saved', () => {
    const repo = new LocalStorageGameRepository()
    expect(repo.load()).toBeNull()
  })

  it('persists and reloads a GameState verbatim', () => {
    const repo = new LocalStorageGameRepository()
    const game = freshGame()

    repo.save(game)
    const reloaded = repo.load()

    expect(reloaded).toEqual(game)
  })

  it('overwrites the previous save when called twice', () => {
    const repo = new LocalStorageGameRepository()
    repo.save(freshGame())

    const updated = { ...freshGame(), roundNumber: 99 }
    repo.save(updated)

    expect(repo.load()?.roundNumber).toBe(99)
  })

  it('clear() wipes the saved game', () => {
    const repo = new LocalStorageGameRepository()
    repo.save(freshGame())

    repo.clear()

    expect(repo.load()).toBeNull()
  })

  it('returns null when the stored JSON is corrupted', () => {
    window.localStorage.setItem(DEFAULT_STORAGE_KEY, '{not-valid-json')
    const repo = new LocalStorageGameRepository()

    expect(repo.load()).toBeNull()
  })

  it('isolates instances that use different keys', () => {
    const repoA = new LocalStorageGameRepository('flip7:test-a')
    const repoB = new LocalStorageGameRepository('flip7:test-b')

    repoA.save({ ...freshGame(), roundNumber: 1 })
    repoB.save({ ...freshGame(), roundNumber: 7 })

    expect(repoA.load()?.roundNumber).toBe(1)
    expect(repoB.load()?.roundNumber).toBe(7)
  })

  it('falls back to null when the underlying Storage.getItem throws', () => {
    const throwingStorage: Storage = {
      ...window.localStorage,
      getItem: vi.fn(() => {
        throw new Error('privacy mode')
      }),
    }
    const repo = new LocalStorageGameRepository(DEFAULT_STORAGE_KEY, throwingStorage)

    expect(repo.load()).toBeNull()
  })

  it('propagates errors from Storage.setItem (eg. quota exceeded)', () => {
    const throwingStorage: Storage = {
      ...window.localStorage,
      setItem: vi.fn(() => {
        throw new Error('QuotaExceeded')
      }),
    }
    const repo = new LocalStorageGameRepository(DEFAULT_STORAGE_KEY, throwingStorage)

    expect(() => repo.save(freshGame())).toThrow(/QuotaExceeded/)
  })
})
