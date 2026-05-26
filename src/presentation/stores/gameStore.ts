import { defineStore } from 'pinia'
import { computed, ref, type Ref } from 'vue'
import type { GameRepository } from '@/application/ports/GameRepository'
import { drawCard } from '@/application/use-cases/drawCard'
import { endRound } from '@/application/use-cases/endRound'
import { resolveAction } from '@/application/use-cases/resolveAction'
import { startGame } from '@/application/use-cases/startGame'
import { stayPlayer } from '@/application/use-cases/stayPlayer'
import {
  isActionCard,
  isNumberCard,
  isSecondChanceCard,
  type ActionCard,
  type Card,
  type NumberCard,
  type SecondChanceCard,
} from '@/domain/entities/Card'
import type { GameState } from '@/domain/entities/GameState'
import { shouldEndRound } from '@/domain/entities/RoundState'
import type { RandomProvider } from '@/domain/ports/RandomProvider'
import { startRound } from '@/domain/rules/round'
import { calculateRoundScore } from '@/domain/rules/score'
import type { CardId } from '@/domain/value-objects/CardId'
import { LocalStorageGameRepository } from '@/infrastructure/persistence/LocalStorageGameRepository'
import { CryptoRandomProvider } from '@/infrastructure/random/CryptoRandomProvider'
import {
  clearHistory,
  loadHistory,
  nowIso,
  saveHistory,
  snapshotHand,
  type HistoryEntry,
} from '@/presentation/stores/history'

interface StoreDeps {
  random: RandomProvider
  repository: GameRepository
}

/**
 * Default dependencies used by every store instance. Tests can call
 * {@link setGameStoreDeps} **before** creating the store to swap them
 * for fakes (eg. an in-memory repository, a seeded RandomProvider).
 */
let activeDeps: StoreDeps = {
  random: new CryptoRandomProvider(),
  repository: new LocalStorageGameRepository(),
}

export function setGameStoreDeps(deps: Partial<StoreDeps>): void {
  activeDeps = { ...activeDeps, ...deps }
}

/**
 * Transient UI event surfaced by the store after a transition.
 * Cleared as soon as the next action happens, so the UI naturally
 * stops showing the banner without any timer.
 */
export type GameEvent =
  | {
      kind: 'bust'
      playerIndex: number
      playerPseudo: string
      /** The number card that triggered the bust (= the drawn duplicate). */
      duplicateCard: NumberCard
    }
  | {
      kind: 'flip7'
      playerIndex: number
      playerPseudo: string
      /** The 7th unique number card that completed the row. */
      finalCard: NumberCard
    }
  | { kind: 'frozen'; playerIndex: number; playerPseudo: string }
  | {
      kind: 'second-chance-save'
      playerIndex: number
      playerPseudo: string
      /** The duplicate number card that the SC neutralised. */
      duplicateCard: NumberCard
      /** The Second Chance card that was consumed. */
      secondChanceCard: SecondChanceCard
    }
  | {
      kind: 'action-drawn'
      /** Index of the player who pulled the card from the deck. */
      playerIndex: number
      playerPseudo: string
      card: ActionCard
    }
  | { kind: 'round-ended'; roundNumber: number }
  | { kind: 'game-finished' }

/**
 * Single source of truth for the current game.
 *
 * The store is a thin orchestration layer:
 *  - state    : `game: GameState | null`, plus a couple of ephemeral
 *               UI hints (lastDrawnCardId, lastEvent).
 *  - actions  : call the application use-cases, persist after each
 *               successful transition, auto-end the round when
 *               `shouldEndRound` becomes true, and surface state
 *               transitions for the UI banner.
 *  - getters  : a few computed helpers the UI will pick up via
 *               `storeToRefs` (or the `useGame` composable).
 */
export const useGameStore = defineStore('game', () => {
  const game: Ref<GameState | null> = ref(null)
  const lastDrawnCardId: Ref<CardId | null> = ref(null)
  const lastEvent: Ref<GameEvent | null> = ref(null)
  /** Per-player score earned in the round that just ended. Aligned on `game.players`. */
  const lastRoundScores: Ref<readonly number[] | null> = ref(null)
  /**
   * Append-only journal of every meaningful transition. Survives
   * reloads via localStorage and is intended for dispute resolution.
   */
  const history: Ref<HistoryEntry[]> = ref([])

  function persist(): void {
    if (game.value !== null) activeDeps.repository.save(game.value)
    saveHistory(history.value)
  }

  function appendHistory(...entries: readonly HistoryEntry[]): void {
    if (entries.length === 0) return
    history.value = [...history.value, ...entries]
  }

  function endRoundIfReady(): void {
    const current = game.value
    if (current === null || current.round === null) return
    if (!shouldEndRound(current.round)) return

    // Snapshot per-player round scores BEFORE they get folded into totals
    // so the RoundEndView can show the delta for each player.
    const deltas = current.round.playerStates.map((state) => calculateRoundScore(state).total)
    lastRoundScores.value = deltas

    const scoresForHistory = current.players.map((player, i) => {
      const delta = deltas[i] ?? 0
      return { pseudo: player.pseudo, delta, total: player.totalScore + delta }
    })

    const next = endRound(current)
    game.value = next

    appendHistory({
      kind: 'round-end',
      roundNumber: current.roundNumber,
      scores: scoresForHistory,
      timestamp: nowIso(),
    })

    if (next.phase === 'finished') {
      const winner = next.players.reduce((max, p) => (p.totalScore > max.totalScore ? p : max))
      appendHistory({
        kind: 'game-finished',
        winnerPseudo: winner.pseudo,
        timestamp: nowIso(),
      })
    }

    // Only set a generic round-ended / game-finished event if no more
    // specific draw event (bust / flip7 / action-drawn / sc-save) was
    // just emitted. The phase transition is driven by `isFinished` /
    // `isBetweenRounds` anyway, the banner here is purely informational.
    if (lastEvent.value === null) {
      lastEvent.value =
        next.phase === 'finished'
          ? { kind: 'game-finished' }
          : { kind: 'round-ended', roundNumber: current.roundNumber }
    }
  }

  function requireGame(): GameState {
    if (game.value === null) {
      throw new Error('gameStore: no game in progress.')
    }
    return game.value
  }

  /** Resolve the index of the player who just drew (priority forced > deal > active). */
  function drawerIndex(before: GameState): number {
    if (before.forcedDraws !== null) return before.forcedDraws.targetIndex
    if (before.dealQueue !== null && before.dealQueue.length > 0) {
      return before.dealQueue[0] as number
    }
    return before.round?.activePlayerIndex ?? 0
  }

  /** Diff active player statuses to detect the most significant transition. */
  function detectEventAfterDraw(
    before: GameState,
    after: GameState,
    drawnCard: Card | null,
  ): GameEvent | null {
    if (!before.round || !after.round) return null

    // Priority 1: Second Chance save (player would have busted otherwise).
    // Detected by a SC slot transitioning from filled to empty during a draw.
    for (let i = 0; i < after.round.playerStates.length; i += 1) {
      const prevSC = before.round.playerStates[i]?.secondChance ?? null
      const currSC = after.round.playerStates[i]?.secondChance ?? null
      if (prevSC !== null && currSC === null) {
        const newDiscards = after.discard.slice(before.discard.length)
        const duplicate = newDiscards.find(isNumberCard)
        const sc = newDiscards.find(isSecondChanceCard)
        if (duplicate && sc) {
          return {
            kind: 'second-chance-save',
            playerIndex: i,
            playerPseudo: after.players[i]?.pseudo ?? '',
            duplicateCard: duplicate,
            secondChanceCard: sc,
          }
        }
      }
    }

    // Priority 2: an Action card was drawn (with or without modal). Surfacing
    // it makes the sole-active-player auto-resolve path visible to the user.
    if (drawnCard !== null && isActionCard(drawnCard)) {
      const idx = drawerIndex(before)
      return {
        kind: 'action-drawn',
        playerIndex: idx,
        playerPseudo: after.players[idx]?.pseudo ?? '',
        card: drawnCard,
      }
    }

    // Priority 3: bust / flip7 status transitions.
    for (let i = 0; i < after.round.playerStates.length; i += 1) {
      const prev = before.round.playerStates[i]?.status
      const curr = after.round.playerStates[i]?.status
      if (prev === 'active' && curr === 'busted' && drawnCard !== null && isNumberCard(drawnCard)) {
        return {
          kind: 'bust',
          playerIndex: i,
          playerPseudo: after.players[i]?.pseudo ?? '',
          duplicateCard: drawnCard,
        }
      }
      if (prev === 'active' && curr === 'flip7' && drawnCard !== null && isNumberCard(drawnCard)) {
        return {
          kind: 'flip7',
          playerIndex: i,
          playerPseudo: after.players[i]?.pseudo ?? '',
          finalCard: drawnCard,
        }
      }
    }
    return null
  }

  /** Convert a draw transition into 1+ history entries (draw + outcome details). */
  function buildDrawHistoryEntries(
    before: GameState,
    after: GameState,
    drawnCard: Card | null,
  ): HistoryEntry[] {
    if (drawnCard === null || !before.round || !after.round) return []

    const idx = drawerIndex(before)
    const drawerPseudo = after.players[idx]?.pseudo ?? ''
    const wasInForcedDraws = before.forcedDraws !== null
    const wasInDealPhase =
      !wasInForcedDraws && before.dealQueue !== null && before.dealQueue.length > 0

    const entries: HistoryEntry[] = []
    entries.push(
      wasInDealPhase
        ? { kind: 'deal', playerPseudo: drawerPseudo, card: drawnCard, timestamp: nowIso() }
        : {
            kind: 'draw',
            playerPseudo: drawerPseudo,
            card: drawnCard,
            forced: wasInForcedDraws,
            timestamp: nowIso(),
          },
    )

    for (let i = 0; i < after.round.playerStates.length; i += 1) {
      const prev = before.round.playerStates[i]
      const curr = after.round.playerStates[i]
      if (prev === undefined || curr === undefined) continue
      const pseudo = after.players[i]?.pseudo ?? ''

      if (prev.secondChance !== null && curr.secondChance === null && isNumberCard(drawnCard)) {
        entries.push({
          kind: 'sc-save',
          playerPseudo: pseudo,
          duplicateValue: drawnCard.value,
          timestamp: nowIso(),
        })
        continue
      }
      if (prev.status === 'active' && curr.status === 'busted' && isNumberCard(drawnCard)) {
        entries.push({
          kind: 'bust',
          playerPseudo: pseudo,
          duplicateValue: drawnCard.value,
          hand: snapshotHand(curr),
          timestamp: nowIso(),
        })
        continue
      }
      if (prev.status === 'active' && curr.status === 'flip7') {
        entries.push({
          kind: 'flip7',
          playerPseudo: pseudo,
          hand: snapshotHand(curr),
          roundScore: calculateRoundScore(curr).total,
          timestamp: nowIso(),
        })
      }
    }

    return entries
  }

  // ----- actions ---------------------------------------------------

  /** Hydrate from the persistence layer. Returns whether a game was found. */
  function loadFromStorage(): boolean {
    const saved = activeDeps.repository.load()
    if (saved === null) return false
    game.value = saved
    history.value = loadHistory()
    return true
  }

  function newGame(pseudos: readonly string[]): void {
    const next = startGame({ random: activeDeps.random }, { pseudos })
    game.value = next
    lastDrawnCardId.value = null
    lastEvent.value = null
    lastRoundScores.value = null
    history.value = []

    // Log the first round-start (startGame already opened round 1).
    if (next.round !== null) {
      appendHistory({
        kind: 'round-start',
        roundNumber: next.roundNumber,
        dealerPseudo: next.players[next.dealerIndex]?.pseudo ?? '',
        timestamp: nowIso(),
      })
    }
    persist()
  }

  function draw(): void {
    const before = requireGame()
    // Snapshot the top card BEFORE drawing so the UI can highlight it.
    // Edge case: when the deck is empty a reshuffle happens inside the
    // use-case and we cannot pre-determine which card will come out; we
    // accept the highlight being skipped for that single draw.
    const topCard = before.deck[0] ?? null
    const after = drawCard({ random: activeDeps.random }, before)
    game.value = after
    lastDrawnCardId.value = topCard?.id ?? null
    lastEvent.value = detectEventAfterDraw(before, after, topCard)
    appendHistory(...buildDrawHistoryEntries(before, after, topCard))
    endRoundIfReady()
    persist()
  }

  function stay(): void {
    const before = requireGame()
    const activeIdx = before.round?.activePlayerIndex ?? 0
    const activeState = before.round?.playerStates[activeIdx]
    const playerPseudo = before.players[activeIdx]?.pseudo ?? ''
    const roundScore = activeState !== undefined ? calculateRoundScore(activeState).total : 0

    game.value = stayPlayer(before)
    lastDrawnCardId.value = null
    lastEvent.value = null
    if (activeState !== undefined) {
      appendHistory({
        kind: 'stay',
        playerPseudo,
        roundScore,
        hand: snapshotHand(activeState),
        timestamp: nowIso(),
      })
    }
    endRoundIfReady()
    persist()
  }

  function resolve(targetIndex: number | null): void {
    const before = requireGame()
    const pending = before.pendingAction

    const after = resolveAction(before, targetIndex)
    game.value = after

    if (pending !== null) {
      const originPseudo = before.players[pending.originIndex]?.pseudo ?? ''
      const targetPseudo =
        targetIndex !== null ? (before.players[targetIndex]?.pseudo ?? null) : null
      appendHistory({
        kind: 'action-resolved',
        card: pending.card,
        originPseudo,
        targetPseudo,
        timestamp: nowIso(),
      })

      // Surface a `frozen` snapshot when a Freeze just locked someone,
      // so the panel shows the row exactly as it was at the moment of
      // the freeze (useful for litige resolution).
      if (
        targetIndex !== null &&
        before.round !== null &&
        after.round !== null &&
        before.round.playerStates[targetIndex]?.status === 'active' &&
        after.round.playerStates[targetIndex]?.status === 'frozen'
      ) {
        const frozenState = after.round.playerStates[targetIndex]!
        appendHistory({
          kind: 'frozen',
          playerPseudo: after.players[targetIndex]?.pseudo ?? '',
          hand: snapshotHand(frozenState),
          timestamp: nowIso(),
        })
      }
    }

    lastDrawnCardId.value = null
    lastEvent.value = null
    endRoundIfReady()
    persist()
  }

  function startNextRound(): void {
    const before = requireGame()
    const next = startRound(before)
    game.value = next
    lastDrawnCardId.value = null
    lastEvent.value = null
    lastRoundScores.value = null
    if (next.round !== null) {
      appendHistory({
        kind: 'round-start',
        roundNumber: next.roundNumber,
        dealerPseudo: next.players[next.dealerIndex]?.pseudo ?? '',
        timestamp: nowIso(),
      })
    }
    persist()
  }

  function reset(): void {
    activeDeps.repository.clear()
    clearHistory()
    game.value = null
    lastDrawnCardId.value = null
    lastEvent.value = null
    lastRoundScores.value = null
    history.value = []
  }

  function dismissEvent(): void {
    lastEvent.value = null
  }

  // ----- getters ---------------------------------------------------

  const phase = computed(() => game.value?.phase ?? null)
  const isInRound = computed(() => game.value?.phase === 'in-round')
  const isBetweenRounds = computed(() => game.value?.phase === 'between-rounds')
  const isFinished = computed(() => game.value?.phase === 'finished')
  const pendingAction = computed(() => game.value?.pendingAction ?? null)

  return {
    game,
    lastDrawnCardId,
    lastEvent,
    lastRoundScores,
    history,
    phase,
    isInRound,
    isBetweenRounds,
    isFinished,
    pendingAction,
    loadFromStorage,
    newGame,
    draw,
    stay,
    resolve,
    startNextRound,
    reset,
    dismissEvent,
  }
})
