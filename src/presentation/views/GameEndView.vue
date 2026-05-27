<script setup lang="ts">
import { computed } from 'vue'
import type { GameState } from '@/domain/entities/GameState'
import { getStandings, WIN_THRESHOLD } from '@/domain/rules/game'
import Avatar from '@/presentation/components/Avatar.vue'

const props = defineProps<{
  game: GameState
}>()

defineEmits<{
  replay: []
}>()

const standings = computed(() => getStandings(props.game))
const winner = computed(() => standings.value[0] ?? null)

const roundsPlayed = computed(() => props.game.roundNumber)

/**
 * Visual treatment per podium rank.
 * - 1st : amber ring + tinted surface (winner card already standalone)
 * - 2nd : slate ring (silver hint)
 * - 3rd : darker amber ring (bronze hint)
 * - rest: default raised surface
 */
function rankClasses(rank: number): string {
  if (rank === 0) return 'bg-status-flip7/10 ring-2 ring-status-flip7'
  if (rank === 1) return 'bg-surface-raised ring-1 ring-slate-500/60'
  if (rank === 2) return 'bg-surface-raised ring-1 ring-amber-900/60'
  return 'bg-surface-raised ring-1 ring-surface-border'
}

function rankBadgeClasses(rank: number): string {
  if (rank === 0) return 'bg-status-flip7 text-slate-950'
  if (rank === 1) return 'bg-slate-400 text-slate-950'
  if (rank === 2) return 'bg-amber-800 text-amber-100'
  return 'bg-surface-overlay text-slate-300'
}

function rankLabel(rank: number): string {
  return rank === 0 ? '1er' : `${rank + 1}e`
}
</script>

<template>
  <section class="flex flex-1 flex-col gap-5 px-4 py-6">
    <header class="text-center">
      <p class="text-[10px] font-semibold tracking-widest text-status-flip7 uppercase">
        Partie terminée
      </p>
      <h2 v-if="winner" class="mt-2 text-4xl font-bold tracking-tight text-slate-100">
        <span class="text-status-flip7">{{ winner.pseudo }}</span> gagne
      </h2>
      <p class="mt-3 font-mono text-xs text-slate-500 tabular-nums">
        {{ winner?.totalScore }} pts · {{ roundsPlayed }}
        {{ roundsPlayed > 1 ? 'manches' : 'manche' }} · seuil {{ WIN_THRESHOLD }}
      </p>
    </header>

    <ol class="flex flex-col gap-2">
      <li
        v-for="(player, rank) in standings"
        :key="player.id"
        class="flex items-center gap-3 rounded-xl px-3 py-2.5"
        :class="rankClasses(rank)"
      >
        <span
          class="flex size-9 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold tabular-nums"
          :class="rankBadgeClasses(rank)"
        >
          {{ rankLabel(rank) }}
        </span>
        <Avatar :pseudo="player.pseudo" size="sm" />
        <span class="min-w-0 flex-1 truncate font-semibold text-slate-100">{{
          player.pseudo
        }}</span>
        <span class="shrink-0 font-mono text-lg font-bold text-slate-100 tabular-nums">
          {{ player.totalScore }}
          <span class="text-xs font-normal text-slate-500">pts</span>
        </span>
      </li>
    </ol>

    <button
      type="button"
      class="mt-auto w-full rounded-xl bg-status-active px-6 py-4 text-lg font-semibold text-slate-950 shadow-lg shadow-status-active/20 transition hover:brightness-110 active:scale-[0.98]"
      @click="$emit('replay')"
    >
      Rejouer
    </button>
  </section>
</template>
