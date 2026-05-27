<script setup lang="ts">
import { computed } from 'vue'
import type { GameState } from '@/domain/entities/GameState'
import Avatar from '@/presentation/components/Avatar.vue'

const props = defineProps<{
  game: GameState
  roundScores: readonly number[] | null
}>()

defineEmits<{
  next: []
}>()

interface PlayerLine {
  pseudo: string
  delta: number
  total: number
  gained: boolean
}

const lines = computed<PlayerLine[]>(() =>
  props.game.players.map((player, index) => {
    const delta = props.roundScores?.[index] ?? 0
    return {
      pseudo: player.pseudo,
      delta,
      total: player.totalScore,
      gained: delta > 0,
    }
  }),
)

const sortedLines = computed(() => [...lines.value].sort((a, b) => b.total - a.total))

const nextDealer = computed(() => props.game.players[props.game.dealerIndex] ?? null)

// Just-completed round: roundNumber is unchanged by endRound, so it still
// points at the round whose results we're showing.
const completedRoundNumber = computed(() => props.game.roundNumber)
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
        class="flex items-center gap-3 rounded-xl bg-surface-raised px-3 py-2.5 ring-1 ring-surface-border"
      >
        <Avatar :pseudo="line.pseudo" size="md" />
        <div class="min-w-0 flex-1">
          <p class="truncate font-semibold text-text-primary">{{ line.pseudo }}</p>
          <p
            class="font-mono text-xs tabular-nums"
            :class="line.gained ? 'text-status-active-text' : 'text-text-tertiary'"
          >
            {{ line.gained ? `+${line.delta} pts ce tour` : 'aucun point ce tour' }}
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
