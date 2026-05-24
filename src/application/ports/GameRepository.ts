import type { GameState } from '@/domain/entities/GameState'

/**
 * Port for persisting the current GameState.
 *
 * Implementations live in `src/infrastructure/persistence/`.
 * The V1 implementation backs onto localStorage; later versions may
 * swap it for a remote backend without touching this contract.
 *
 * The API is synchronous because the V1 backing store is too - when
 * (if) we move to network persistence, this contract will switch to
 * Promise-returning methods and callers will await accordingly.
 */
export interface GameRepository {
  /** Return the last persisted game, or `null` if none was ever stored. */
  load(): GameState | null

  /** Replace whatever was previously stored with this snapshot. */
  save(game: GameState): void

  /** Remove any persisted game (eg. user clicked "New game"). */
  clear(): void
}
