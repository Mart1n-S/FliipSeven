<script setup lang="ts">
import { computed } from 'vue'
import type { GameState } from '@/domain/entities/GameState'
import { getStandings, WIN_THRESHOLD } from '@/domain/rules/game'

const props = defineProps<{
  game: GameState
}>()

defineEmits<{
  replay: []
}>()

const standings = computed(() => getStandings(props.game))
const winner = computed(() => standings.value[0] ?? null)

const roundsPlayed = computed(() => props.game.roundNumber)

function rankClasses(rank: number): string {
  if (rank === 0) return 'ring-2 ring-amber-400 bg-amber-500/10'
  if (rank === 1) return 'ring-1 ring-slate-500 bg-slate-800'
  if (rank === 2) return 'ring-1 ring-amber-900/60 bg-slate-800'
  return 'bg-slate-800/80'
}

function rankLabel(rank: number): string {
  return rank === 0 ? '1er' : `${rank + 1}e`
}
</script>

<template>
  <section class="flex flex-1 flex-col gap-5 px-4 py-6">
    <header class="text-center">
      <p class="text-xs tracking-widest text-amber-300/80 uppercase">Partie terminée</p>
      <h2 v-if="winner" class="mt-1 text-3xl font-bold text-amber-300">
        {{ winner.pseudo }} gagne !
      </h2>
      <p class="mt-2 text-sm text-slate-400">
        {{ winner?.totalScore }} pts &nbsp;·&nbsp; {{ roundsPlayed }}
        {{ roundsPlayed > 1 ? 'manches jouées' : 'manche jouée' }} &nbsp;·&nbsp; seuil
        {{ WIN_THRESHOLD }}
      </p>
    </header>

    <ol class="flex flex-col gap-2">
      <li
        v-for="(player, rank) in standings"
        :key="player.id"
        class="flex items-center justify-between rounded-xl px-4 py-3"
        :class="rankClasses(rank)"
      >
        <div class="flex items-center gap-3 truncate">
          <span
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
            :class="rank === 0 ? 'bg-amber-400 text-amber-950' : 'bg-slate-700 text-slate-200'"
          >
            {{ rankLabel(rank) }}
          </span>
          <span class="truncate font-medium text-slate-100">{{ player.pseudo }}</span>
        </div>
        <span class="font-mono text-base text-indigo-200 tabular-nums">
          {{ player.totalScore }} pts
        </span>
      </li>
    </ol>

    <button
      type="button"
      class="mt-auto w-full rounded-xl bg-indigo-500 px-6 py-4 text-lg font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400 active:scale-95"
      @click="$emit('replay')"
    >
      Rejouer
    </button>
  </section>
</template>
