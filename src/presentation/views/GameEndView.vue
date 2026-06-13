<script setup lang="ts">
import { computed } from 'vue'
import type { GameState } from '@/domain/entities/GameState'
import type { Player } from '@/domain/entities/Player'
import { getStandings, getWinners, WIN_THRESHOLD } from '@/domain/rules/game'
import Avatar from '@/presentation/components/Avatar.vue'

const props = defineProps<{
  game: GameState
}>()

defineEmits<{
  replay: []
}>()

const standings = computed(() => getStandings(props.game))
const winners = computed(() => getWinners(props.game))
const isTie = computed(() => winners.value.length > 1)
const topScore = computed(() => standings.value[0]?.totalScore ?? 0)

/** "Alice", "Alice & Bob", or "Alice, Bob & Charlie". */
const winnersLabel = computed(() => {
  const names = winners.value.map((p) => p.pseudo)
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`
})

const roundsPlayed = computed(() => props.game.roundNumber)

/**
 * Competition rank (0-based): players with the same score share a rank,
 * and the next rank skips accordingly (1224). This makes tied leaders all
 * show as "1er" and tints them all as winners.
 */
function competitionRank(player: Player): number {
  return standings.value.filter((p) => p.totalScore > player.totalScore).length
}

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
  if (rank === 0) return 'bg-status-flip7 text-text-inverse'
  if (rank === 1) return 'bg-slate-400 text-text-inverse'
  if (rank === 2) return 'bg-amber-800 text-amber-100'
  return 'bg-surface-overlay text-text-secondary'
}

function rankLabel(rank: number): string {
  return rank === 0 ? '1er' : `${rank + 1}e`
}
</script>

<template>
  <section class="flex flex-1 flex-col gap-5 px-4 py-6">
    <header class="text-center">
      <p class="text-[10px] font-semibold tracking-widest text-status-flip7-text uppercase">
        {{ isTie ? 'Égalité en tête' : 'Partie terminée' }}
      </p>
      <h2 v-if="winnersLabel" class="mt-2 text-4xl font-bold tracking-tight text-text-primary">
        <span class="text-status-flip7-text">{{ winnersLabel }}</span>
        {{ isTie ? 'ex æquo' : 'gagne' }}
      </h2>
      <p class="mt-3 font-mono text-xs text-text-tertiary tabular-nums">
        {{ topScore }} pts · {{ roundsPlayed }} {{ roundsPlayed > 1 ? 'manches' : 'manche' }} ·
        seuil {{ WIN_THRESHOLD }}
      </p>
    </header>

    <ol class="flex flex-col gap-2">
      <li
        v-for="player in standings"
        :key="player.id"
        class="flex items-center gap-3 rounded-xl px-3 py-2.5"
        :class="rankClasses(competitionRank(player))"
      >
        <span
          class="flex size-9 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold tabular-nums"
          :class="rankBadgeClasses(competitionRank(player))"
        >
          {{ rankLabel(competitionRank(player)) }}
        </span>
        <Avatar :pseudo="player.pseudo" size="sm" />
        <span class="min-w-0 flex-1 truncate font-semibold text-text-primary">{{
          player.pseudo
        }}</span>
        <span class="shrink-0 font-mono text-lg font-bold text-text-primary tabular-nums">
          {{ player.totalScore }}
          <span class="text-xs font-normal text-text-tertiary">pts</span>
        </span>
      </li>
    </ol>

    <button
      type="button"
      class="mt-auto w-full rounded-xl bg-status-active px-6 py-4 text-lg font-semibold text-text-inverse shadow-lg shadow-status-active/20 transition hover:brightness-110 active:scale-[0.98]"
      @click="$emit('replay')"
    >
      Rejouer
    </button>
  </section>
</template>
