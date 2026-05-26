<script setup lang="ts">
import { computed } from 'vue'
import type { Player } from '@/domain/entities/Player'
import type { PlayerRoundState } from '@/domain/entities/PlayerRoundState'
import { calculateRoundScore } from '@/domain/rules/score'
import type { CardId } from '@/domain/value-objects/CardId'
import Avatar from '@/presentation/components/Avatar.vue'
import CardView from '@/presentation/components/CardView.vue'
import StatusBadge from '@/presentation/components/StatusBadge.vue'

const props = defineProps<{
  player: Player
  state: PlayerRoundState | null
  isActive: boolean
  isDealer: boolean
  /** When set, the matching card on the row plays the flash-in animation. */
  highlightedCardId?: CardId | null
}>()

const roundScore = computed(() => (props.state ? calculateRoundScore(props.state).total : 0))

/**
 * Color of the large round-score number. We tint the score in the
 * player's status color, except for active players: cyan makes the
 * eye jump to whoever is about to play.
 */
const scoreColor = computed(() => {
  if (props.isActive) return 'text-[--color-status-active]'
  if (props.state === null) return 'text-slate-100'
  switch (props.state.status) {
    case 'busted':
      return 'text-slate-600 line-through decoration-1'
    case 'frozen':
      return 'text-[--color-status-frozen]'
    case 'flip7':
      return 'text-[--color-status-flip7]'
    case 'stayed':
    case 'active':
    default:
      return 'text-slate-100'
  }
})

/**
 * Container styling per status.
 * - active   : cyan ring + slightly raised surface
 * - busted   : dimmed, no ring
 * - frozen   : sky-tinted hint, dimmed
 * - flip7    : amber ring
 * - default  : raised surface, faint border
 */
const containerClass = computed(() => {
  if (props.isActive) {
    return 'bg-[--color-surface-raised] ring-2 ring-[--color-status-active] shadow-lg shadow-[--color-status-active]/10'
  }
  if (props.state?.status === 'busted') {
    return 'bg-[--color-surface-base] ring-1 ring-[--color-surface-border]/60 opacity-70'
  }
  if (props.state?.status === 'frozen') {
    return 'bg-[--color-surface-base] ring-1 ring-[--color-status-frozen]/30 opacity-80'
  }
  if (props.state?.status === 'flip7') {
    return 'bg-[--color-surface-raised] ring-2 ring-[--color-status-flip7]'
  }
  return 'bg-[--color-surface-raised] ring-1 ring-[--color-surface-border]'
})

const nameClass = computed(() => {
  if (props.state?.status === 'busted') return 'text-slate-500 line-through decoration-1'
  return 'text-slate-100'
})

const isEmpty = computed(
  () =>
    props.state !== null &&
    props.state.numberCards.length === 0 &&
    props.state.modifiers.length === 0 &&
    props.state.secondChance === null,
)
</script>

<template>
  <article
    class="rounded-2xl p-3.5 transition-all duration-200"
    :class="containerClass"
    :aria-current="isActive ? 'true' : undefined"
  >
    <div class="flex items-center gap-3">
      <Avatar
        :pseudo="player.pseudo"
        :status="state?.status ?? null"
        :active="isActive"
        size="md"
      />

      <div class="min-w-0 flex-1">
        <header class="mb-1.5 flex flex-wrap items-center gap-2">
          <span class="truncate font-semibold" :class="nameClass">{{ player.pseudo }}</span>
          <StatusBadge v-if="state" :status="state.status" />
          <span
            v-if="isDealer"
            class="inline-flex items-center rounded-md bg-[--color-surface-overlay] px-2 py-0.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase ring-1 ring-[--color-surface-border]"
            title="Donneur de cette manche"
          >
            Donneur
          </span>
        </header>

        <!-- Cards row: numbers + modifiers + second chance inline -->
        <div v-if="state && !isEmpty" class="flex flex-wrap items-center gap-1">
          <CardView
            v-for="card in state.numberCards"
            :key="card.id"
            :card="card"
            size="sm"
            :highlight="card.id === highlightedCardId"
          />
          <CardView
            v-for="card in state.modifiers"
            :key="card.id"
            :card="card"
            size="sm"
            :highlight="card.id === highlightedCardId"
          />
          <CardView
            v-if="state.secondChance"
            :card="state.secondChance"
            size="sm"
            :highlight="state.secondChance.id === highlightedCardId"
          />
        </div>

        <p v-else-if="state" class="text-xs text-slate-500 italic">Aucune carte</p>
      </div>

      <div class="shrink-0 text-right">
        <p class="font-mono text-3xl leading-none font-bold tabular-nums" :class="scoreColor">
          {{ roundScore }}
        </p>
        <p class="mt-1.5 font-mono text-[11px] tracking-wide text-slate-500 tabular-nums">
          {{ player.totalScore }} pts
        </p>
      </div>
    </div>
  </article>
</template>
