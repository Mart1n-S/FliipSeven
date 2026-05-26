import type {
  ActionCard,
  Card,
  ModifierCard,
  NumberCard,
  SecondChanceCard,
} from '@/domain/entities/Card'
import type { PlayerRoundState } from '@/domain/entities/PlayerRoundState'
import type { NumberValue } from '@/domain/value-objects/NumberValue'

/** Snapshot of a player's row at the moment a status change happened. */
export interface PlayerHandSnapshot {
  readonly numberCards: readonly NumberCard[]
  readonly modifiers: readonly ModifierCard[]
  readonly secondChance: SecondChanceCard | null
}

export function snapshotHand(state: PlayerRoundState): PlayerHandSnapshot {
  return {
    numberCards: [...state.numberCards],
    modifiers: [...state.modifiers],
    secondChance: state.secondChance,
  }
}

/**
 * Single entry of the game journal.
 *
 * The journal is append-only and grows across rounds until the user
 * starts a new game (or explicitly clears it). It is meant for
 * dispute resolution: every transition that changes the visible
 * state of the table is captured here with a UTC ISO timestamp.
 *
 * Status-change entries (bust / stay / flip7 / frozen) carry a
 * {@link PlayerHandSnapshot} so the panel can show the player's full
 * row exactly as it was at that moment - useful when the user wants
 * to double-check why a player was eliminated.
 */
export type HistoryEntry =
  | {
      readonly kind: 'round-start'
      readonly roundNumber: number
      readonly dealerPseudo: string
      readonly timestamp: string
    }
  | {
      readonly kind: 'deal'
      readonly playerPseudo: string
      readonly card: Card
      readonly timestamp: string
    }
  | {
      readonly kind: 'draw'
      readonly playerPseudo: string
      readonly card: Card
      readonly forced: boolean
      readonly timestamp: string
    }
  | {
      readonly kind: 'bust'
      readonly playerPseudo: string
      readonly duplicateValue: NumberValue
      readonly hand: PlayerHandSnapshot
      readonly timestamp: string
    }
  | {
      readonly kind: 'flip7'
      readonly playerPseudo: string
      readonly hand: PlayerHandSnapshot
      readonly roundScore: number
      readonly timestamp: string
    }
  | {
      readonly kind: 'sc-save'
      readonly playerPseudo: string
      readonly duplicateValue: NumberValue
      readonly timestamp: string
    }
  | {
      readonly kind: 'stay'
      readonly playerPseudo: string
      readonly roundScore: number
      readonly hand: PlayerHandSnapshot
      readonly timestamp: string
    }
  | {
      readonly kind: 'frozen'
      readonly playerPseudo: string
      readonly hand: PlayerHandSnapshot
      readonly timestamp: string
    }
  | {
      readonly kind: 'action-resolved'
      readonly card: ActionCard
      readonly originPseudo: string
      readonly targetPseudo: string | null
      readonly timestamp: string
    }
  | {
      readonly kind: 'round-end'
      readonly roundNumber: number
      readonly scores: ReadonlyArray<{
        readonly pseudo: string
        readonly delta: number
        readonly total: number
      }>
      readonly timestamp: string
    }
  | {
      readonly kind: 'game-finished'
      readonly winnerPseudo: string
      readonly timestamp: string
    }

export const HISTORY_STORAGE_KEY = 'flip7:history-v1'

/** Read the journal from localStorage. Returns [] on miss or corruption. */
export function loadHistory(storage: Storage = window.localStorage): HistoryEntry[] {
  let raw: string | null
  try {
    raw = storage.getItem(HISTORY_STORAGE_KEY)
  } catch {
    return []
  }
  if (raw === null) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : []
  } catch {
    return []
  }
}

export function saveHistory(
  history: readonly HistoryEntry[],
  storage: Storage = window.localStorage,
): void {
  storage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history))
}

export function clearHistory(storage: Storage = window.localStorage): void {
  storage.removeItem(HISTORY_STORAGE_KEY)
}

export function nowIso(): string {
  return new Date().toISOString()
}
