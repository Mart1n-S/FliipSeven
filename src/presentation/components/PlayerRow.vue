<script setup lang="ts">
import { computed } from 'vue'
import type { Player } from '@/domain/entities/Player'
import type { PlayerRoundState } from '@/domain/entities/PlayerRoundState'
import { calculateRoundScore } from '@/domain/rules/score'
import type { CardId } from '@/domain/value-objects/CardId'
import type { PlayerStatus } from '@/domain/value-objects/PlayerStatus'
import CardView from '@/presentation/components/CardView.vue'

const props = defineProps<{
  player: Player
  state: PlayerRoundState | null
  isActive: boolean
  isDealer: boolean
  /** When set, the matching card on the row plays the flash-in animation. */
  highlightedCardId?: CardId | null
}>()

const roundScore = computed(() => (props.state ? calculateRoundScore(props.state).total : 0))

const statusBadge = computed<{ label: string; classes: string } | null>(() => {
  if (props.state === null) return null
  const map: Record<PlayerStatus, { label: string; classes: string } | null> = {
    active: null,
    stayed: { label: 'Reste', classes: 'bg-slate-700 text-slate-200' },
    busted: { label: 'Perdu', classes: 'bg-rose-900/60 text-rose-200' },
    frozen: { label: 'Gelé', classes: 'bg-sky-900/60 text-sky-200' },
    flip7: { label: 'Flip 7', classes: 'bg-amber-500/30 text-amber-200' },
  }
  return map[props.state.status]
})

const containerClass = computed(() => {
  if (props.isActive) {
    return 'border-indigo-400 bg-slate-800 ring-1 ring-indigo-400/40'
  }
  if (props.state?.status === 'busted' || props.state?.status === 'frozen') {
    return 'border-slate-800 bg-slate-900/60 opacity-60'
  }
  if (props.state?.status === 'flip7') {
    return 'border-amber-500/50 bg-slate-800'
  }
  return 'border-slate-800 bg-slate-900'
})
</script>

<template>
  <article
    class="rounded-xl border p-3 transition"
    :class="containerClass"
    :aria-current="isActive ? 'true' : undefined"
  >
    <header class="mb-2 flex items-center justify-between gap-2">
      <div class="flex items-center gap-2 truncate">
        <span class="truncate font-semibold text-slate-100">{{ player.pseudo }}</span>
        <span
          v-if="isDealer"
          class="rounded bg-slate-700 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-slate-300 uppercase"
          title="Donneur de cette manche"
        >
          Donneur
        </span>
        <span
          v-if="statusBadge"
          class="rounded px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase"
          :class="statusBadge.classes"
        >
          {{ statusBadge.label }}
        </span>
      </div>

      <div class="text-right">
        <p class="font-mono text-base text-indigo-200 tabular-nums">
          {{ player.totalScore }}
          <span class="text-xs text-slate-500">pts</span>
        </p>
        <p
          v-if="state && roundScore > 0"
          class="font-mono text-xs text-slate-400 tabular-nums"
          title="Score provisoire de la manche"
        >
          +{{ roundScore }}
        </p>
      </div>
    </header>

    <div v-if="state" class="flex flex-col gap-2">
      <!-- Number cards -->
      <div v-if="state.numberCards.length > 0" class="flex flex-wrap gap-1">
        <CardView
          v-for="card in state.numberCards"
          :key="card.id"
          :card="card"
          size="sm"
          :highlight="card.id === highlightedCardId"
        />
      </div>

      <!-- Modifiers + Second Chance -->
      <div
        v-if="state.modifiers.length > 0 || state.secondChance"
        class="flex flex-wrap items-center gap-1"
      >
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

      <p
        v-if="state.numberCards.length === 0 && state.modifiers.length === 0 && !state.secondChance"
        class="text-xs text-slate-500 italic"
      >
        Aucune carte
      </p>
    </div>
  </article>
</template>
