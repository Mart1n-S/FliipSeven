<script setup lang="ts">
import { computed } from 'vue'
import type { GameState } from '@/domain/entities/GameState'
import type { PlayerStatus } from '@/domain/value-objects/PlayerStatus'
import Avatar from '@/presentation/components/Avatar.vue'
import CardView from '@/presentation/components/CardView.vue'
import StatusBadge from '@/presentation/components/StatusBadge.vue'
import type { RoundEndSummary } from '@/presentation/stores/gameStore'

const props = defineProps<{
  game: GameState
  roundScores: readonly number[] | null
  roundEnd: RoundEndSummary | null
}>()

defineEmits<{
  next: []
}>()

interface PlayerLine {
  pseudo: string
  delta: number
  total: number
  gained: boolean
  status: PlayerStatus | null
  hand: RoundEndSummary['players'][number]['hand'] | null
}

const lines = computed<PlayerLine[]>(() =>
  props.game.players.map((player, index) => {
    const delta = props.roundScores?.[index] ?? 0
    const summary = props.roundEnd?.players[index] ?? null
    return {
      pseudo: player.pseudo,
      delta,
      total: player.totalScore,
      gained: delta > 0,
      status: summary?.status ?? null,
      hand: summary?.hand ?? null,
    }
  }),
)

const sortedLines = computed(() => [...lines.value].sort((a, b) => b.total - a.total))

const nextDealer = computed(() => props.game.players[props.game.dealerIndex] ?? null)

// Just-completed round: roundNumber is unchanged by endRound, so it still
// points at the round whose results we're showing.
const completedRoundNumber = computed(() => props.game.roundNumber)

/** Headline explaining why the round ended (shown at the very top). */
const reasonText = computed<string | null>(() => {
  const reason = props.roundEnd?.reason
  if (!reason) return null
  switch (reason.kind) {
    case 'flip7':
      return `${reason.pseudo} a réalisé un Flip 7 - la manche s'arrête aussitôt.`
    case 'bust':
      return `${reason.pseudo} a tiré un second ${reason.duplicateValue} : éliminé. Plus aucun joueur en jeu, la manche s'arrête.`
    case 'frozen':
      return `${reason.pseudo} a été gelé. Plus aucun joueur en jeu, la manche s'arrête.`
    case 'deck-empty':
      return 'Plus aucune carte à piocher (toutes sont en jeu) : chaque joueur garde ses points et la manche s\'arrête.'
    case 'all-stopped':
      return 'Tous les joueurs se sont arrêtés ou ont été éliminés.'
    default: {
      const _exhaustive: never = reason
      return _exhaustive
    }
  }
})

const reasonAccent = computed(() => {
  const kind = props.roundEnd?.reason.kind
  if (kind === 'flip7') return 'bg-status-flip7'
  if (kind === 'bust') return 'bg-status-busted'
  if (kind === 'frozen') return 'bg-status-frozen'
  return 'bg-accent-info'
})

function deltaLabel(line: PlayerLine): string {
  if (line.gained) return `+${line.delta} pts ce tour`
  if (line.status === 'busted') return 'éliminé · 0 pt'
  if (line.status === 'frozen') return 'gelé · 0 pt'
  return 'aucun point ce tour'
}

function isEmptyHand(hand: PlayerLine['hand']): boolean {
  if (!hand) return true
  return hand.numberCards.length === 0 && hand.modifiers.length === 0 && hand.secondChance === null
}
</script>

<template>
  <section class="flex flex-1 flex-col gap-5 px-4 py-6">
    <header class="rounded-2xl bg-surface-raised p-4 ring-1 ring-surface-border">
      <p class="text-[10px] font-semibold tracking-widest text-text-tertiary uppercase">
        Manche
        <span class="font-mono text-text-secondary tabular-nums">{{ completedRoundNumber }}</span>
        terminée
      </p>
      <h2 class="mt-1 text-2xl font-bold text-text-primary">Place au décompte</h2>

      <!-- Why the round ended: surfaced here so it isn't missed when the
           table churns quickly (eg. the last active player busting). -->
      <div
        v-if="reasonText"
        class="relative mt-3 overflow-hidden rounded-xl bg-surface-base py-2.5 pr-3 pl-4 ring-1 ring-surface-border"
      >
        <span
          class="absolute top-0 bottom-0 left-0 w-1"
          :class="reasonAccent"
          aria-hidden="true"
        />
        <p class="text-sm text-text-secondary">{{ reasonText }}</p>
      </div>

      <div v-if="nextDealer" class="mt-3 flex items-center gap-2 text-sm">
        <span class="text-text-tertiary">Prochain donneur :</span>
        <span
          class="inline-flex items-center gap-1.5 rounded-md bg-surface-base py-0.5 pr-2.5 pl-1 ring-1 ring-surface-border"
        >
          <Avatar :pseudo="nextDealer.pseudo" size="sm" />
          <span class="text-xs font-medium text-text-primary">{{ nextDealer.pseudo }}</span>
        </span>
      </div>
    </header>

    <ul class="flex flex-col gap-2">
      <li
        v-for="line in sortedLines"
        :key="line.pseudo"
        class="rounded-xl bg-surface-raised px-3 py-2.5 ring-1 ring-surface-border"
      >
        <div class="flex items-center gap-3">
          <Avatar :pseudo="line.pseudo" :status="line.status" size="md" />
          <div class="min-w-0 flex-1">
            <p class="flex items-center gap-2 truncate font-semibold text-text-primary">
              <span class="truncate">{{ line.pseudo }}</span>
              <StatusBadge v-if="line.status" :status="line.status" />
            </p>
            <p
              class="font-mono text-xs tabular-nums"
              :class="line.gained ? 'text-status-active-text' : 'text-text-tertiary'"
            >
              {{ deltaLabel(line) }}
            </p>
          </div>
          <div class="shrink-0 text-right">
            <p class="font-mono text-2xl leading-none font-bold text-text-primary tabular-nums">
              {{ line.total }}
            </p>
            <p class="mt-1 font-mono text-[10px] tracking-wide text-text-tertiary uppercase">
              pts total
            </p>
          </div>
        </div>

        <!-- Final row of cards for this player (no need to open history). -->
        <div
          v-if="line.hand && !isEmptyHand(line.hand)"
          class="mt-2.5 flex flex-wrap items-center gap-1"
        >
          <CardView v-for="card in line.hand.numberCards" :key="card.id" :card="card" size="sm" />
          <CardView v-for="card in line.hand.modifiers" :key="card.id" :card="card" size="sm" />
          <CardView v-if="line.hand.secondChance" :card="line.hand.secondChance" size="sm" />
        </div>
        <p
          v-else-if="line.hand"
          class="mt-2 text-xs text-text-tertiary italic"
        >
          Aucune carte ce tour
        </p>
      </li>
    </ul>

    <button
      type="button"
      class="mt-auto w-full rounded-xl bg-status-active px-6 py-4 text-lg font-semibold text-text-inverse shadow-lg shadow-status-active/20 transition hover:brightness-110 active:scale-[0.98]"
      @click="$emit('next')"
    >
      Manche suivante
    </button>
  </section>
</template>
