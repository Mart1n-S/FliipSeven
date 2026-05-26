import { computed, onBeforeUnmount, watch } from 'vue'
import { isSecondChanceCard } from '@/domain/entities/Card'
import { getValidActionTargets } from '@/domain/rules/actions/targets'
import { calculateRoundScore } from '@/domain/rules/score'
import { useGameStore } from '@/presentation/stores/gameStore'

export interface TargetChoice {
  readonly index: number
  readonly pseudo: string
  /** Provisional round score of the target, surfaced in the modal so
   *  the origin can pick informed (eg. gel the leading player). */
  readonly roundScore: number
}

/**
 * Delay (ms) before an auto-resolution happens. Without it the
 * `action-drawn` event banner would be wiped instantly by the
 * subsequent `resolve()` call - the user would never see which
 * card was actually pulled. With it, the banner is on screen long
 * enough to register.
 */
const AUTO_RESOLVE_DELAY_MS = 900

/**
 * Glue between the store's `pendingAction` state and the UI:
 *  - exposes the list of valid targets (with pseudos) for the modal,
 *  - auto-resolves trivial cases (0 or 1 valid target) so the user
 *    only sees a target selector when there is an actual choice.
 *
 * Auto-resolution rules:
 *  - **Freeze / Flip Three** with a single valid target -> apply
 *    directly (typically the origin when they are the only active).
 *  - **Second Chance** with 0 valid targets -> resolve with `null`
 *    so the use-case discards the card (per rule book).
 *  - **Second Chance** with exactly 1 valid target -> apply directly
 *    (either origin's empty slot, or the only eligible other player).
 *
 * Auto-resolutions are deferred by {@link AUTO_RESOLVE_DELAY_MS} so
 * the `action-drawn` banner stays visible long enough.
 */
export function useActionResolution() {
  const store = useGameStore()

  const choices = computed<readonly TargetChoice[]>(() => {
    const game = store.game
    const pending = store.pendingAction
    if (game === null || game.round === null || pending === null) return []

    const round = game.round
    return getValidActionTargets(pending.card, round.playerStates, pending.originIndex)
      .map((index) => {
        const pseudo = game.players[index]?.pseudo
        const state = round.playerStates[index]
        if (pseudo === undefined || state === undefined) return null
        return { index, pseudo, roundScore: calculateRoundScore(state).total }
      })
      .filter((c): c is TargetChoice => c !== null)
  })

  const requiresUserChoice = computed(() => choices.value.length >= 2)

  let autoResolveTimer: ReturnType<typeof setTimeout> | null = null

  function cancelAutoResolve(): void {
    if (autoResolveTimer !== null) {
      clearTimeout(autoResolveTimer)
      autoResolveTimer = null
    }
  }

  function scheduleAutoResolve(cardId: string, targetIndex: number | null): void {
    cancelAutoResolve()
    autoResolveTimer = setTimeout(() => {
      autoResolveTimer = null
      // Make sure the pending action is still the same one we
      // scheduled for: a manual resolve in the meantime would have
      // changed (or cleared) it, and we must not stomp on that.
      const pending = store.pendingAction
      if (pending === null || pending.card.id !== cardId) return
      store.resolve(targetIndex)
    }, AUTO_RESOLVE_DELAY_MS)
  }

  // Auto-resolve when no real choice exists. The watch on the pending
  // card id (not the whole object) makes sure we run exactly once per
  // distinct pending action.
  watch(
    () => store.pendingAction?.card.id ?? null,
    () => {
      cancelAutoResolve()
      const pending = store.pendingAction
      if (pending === null) return

      const targets = choices.value
      if (targets.length >= 2) return // user choice required, leave it open

      if (targets.length === 1) {
        scheduleAutoResolve(pending.card.id, targets[0]!.index)
        return
      }

      // No valid target: only Second Chance has this fallback (-> discard).
      if (isSecondChanceCard(pending.card)) {
        scheduleAutoResolve(pending.card.id, null)
      }
      // Freeze / Flip Three should always have at least one active target
      // (the origin themselves). Hitting 0 here would be a domain bug.
    },
    { immediate: true, flush: 'post' },
  )

  onBeforeUnmount(cancelAutoResolve)

  return { choices, requiresUserChoice }
}
