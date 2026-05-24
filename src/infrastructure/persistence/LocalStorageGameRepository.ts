import type { GameRepository } from '@/application/ports/GameRepository'
import type { GameState } from '@/domain/entities/GameState'

/** Default key used by the repository (versioned so a future schema change can ignore old data). */
export const DEFAULT_STORAGE_KEY = 'flip7:game-state-v1'

/**
 * Persists the current GameState in the browser's `localStorage`.
 *
 * - `load()` returns `null` if nothing was saved or if the saved data
 *   is corrupted (we silently fall back to "no saved game" rather than
 *   forcing the user to manually clear bad data).
 * - `save()` may throw (eg. the quota is exceeded or storage is
 *   disabled in private mode). Callers can catch and notify the user.
 * - `clear()` is a no-op when nothing was stored.
 *
 * The constructor accepts a custom key so tests can isolate themselves
 * and future features (multiple parties, named saves) can target
 * dedicated slots.
 */
export class LocalStorageGameRepository implements GameRepository {
  private readonly storage: Storage
  private readonly key: string

  constructor(key: string = DEFAULT_STORAGE_KEY, storage: Storage = window.localStorage) {
    this.key = key
    this.storage = storage
  }

  load(): GameState | null {
    let raw: string | null
    try {
      raw = this.storage.getItem(this.key)
    } catch {
      return null
    }
    if (raw === null) return null

    try {
      return JSON.parse(raw) as GameState
    } catch {
      // Corrupted JSON - start fresh rather than break the app.
      return null
    }
  }

  save(game: GameState): void {
    this.storage.setItem(this.key, JSON.stringify(game))
  }

  clear(): void {
    this.storage.removeItem(this.key)
  }
}
