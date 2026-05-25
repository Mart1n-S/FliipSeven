<script setup lang="ts">
import { computed } from 'vue'
import type { GameState } from '@/domain/entities/GameState'

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
  status: 'gained' | 'zero'
}

const lines = computed<PlayerLine[]>(() =>
  props.game.players.map((player, index) => {
    const delta = props.roundScores?.[index] ?? 0
    return {
      pseudo: player.pseudo,
      delta,
      total: player.totalScore,
      status: delta > 0 ? 'gained' : 'zero',
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
    <header>
      <h2 class="text-xl font-bold text-slate-100">Manche {{ completedRoundNumber }} terminée</h2>
      <p v-if="nextDealer" class="mt-1 text-sm text-slate-400">
        Prochain donneur :
        <span class="font-semibold text-slate-200">{{ nextDealer.pseudo }}</span>
      </p>
    </header>

    <ul class="flex flex-col gap-2">
      <li
        v-for="line in sortedLines"
        :key="line.pseudo"
        class="flex items-center justify-between rounded-lg bg-slate-800 px-4 py-3"
      >
        <span class="truncate font-medium text-slate-100">{{ line.pseudo }}</span>
        <div class="flex items-baseline gap-3 font-mono tabular-nums">
          <span
            class="text-sm"
            :class="line.status === 'gained' ? 'text-emerald-300' : 'text-slate-500'"
          >
            {{ line.delta > 0 ? `+${line.delta}` : '0' }}
          </span>
          <span class="text-base text-indigo-200">{{ line.total }} pts</span>
        </div>
      </li>
    </ul>

    <button
      type="button"
      class="mt-auto w-full rounded-xl bg-indigo-500 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400 active:scale-95"
      @click="$emit('next')"
    >
      Manche suivante
    </button>
  </section>
</template>
