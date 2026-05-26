<script setup lang="ts">
import { computed } from 'vue'
import CardView from '@/presentation/components/CardView.vue'
import type { GameEvent } from '@/presentation/stores/gameStore'

const props = defineProps<{
  event: GameEvent
}>()

defineEmits<{
  dismiss: []
}>()

const ACTION_LABEL = {
  freeze: 'Gel',
  'flip-three': 'Trois à la Suite',
  'second-chance': 'Seconde Chance',
} as const

/**
 * Per-kind banner data: the small uppercase tag, the big headline,
 * the muted sub-explanation, and the accent color that drives the
 * left bar + the tag tint. Headlines stay short (action-oriented),
 * details go into `sub` so the eye reads top to bottom.
 */
interface BannerStyle {
  readonly tag: string
  readonly headline: string
  readonly sub: string
  readonly accent: string
  readonly tagClasses: string
}

const style = computed<BannerStyle>(() => {
  const e = props.event
  switch (e.kind) {
    case 'bust':
      return {
        tag: 'Bust',
        headline: `${e.playerPseudo} explose`,
        sub: `Doublon de ${e.duplicateCard.value} - toutes ses cartes sont défaussées`,
        accent: 'bg-status-busted',
        tagClasses: 'text-status-busted',
      }
    case 'flip7':
      return {
        tag: 'Flip 7',
        headline: `${e.playerPseudo} réussit le Flip 7`,
        sub: `7 cartes uniques, +15 points bonus`,
        accent: 'bg-status-flip7',
        tagClasses: 'text-status-flip7',
      }
    case 'frozen':
      return {
        tag: 'Gel',
        headline: `${e.playerPseudo} gelé`,
        sub: 'Ses points du tour sont perdus',
        accent: 'bg-status-frozen',
        tagClasses: 'text-status-frozen',
      }
    case 'second-chance-save':
      return {
        tag: 'Seconde Chance',
        headline: `${e.playerPseudo} évite le pire`,
        sub: `Doublon de ${e.duplicateCard.value} neutralisé`,
        accent: 'bg-emerald-400',
        tagClasses: 'text-emerald-300',
      }
    case 'action-drawn':
      return {
        tag: 'Carte action',
        headline: `${e.playerPseudo} pioche un ${ACTION_LABEL[e.card.action]}`,
        sub: 'En attente de résolution',
        accent: 'bg-status-flip7',
        tagClasses: 'text-status-flip7',
      }
    case 'round-ended':
      return {
        tag: `Manche ${e.roundNumber}`,
        headline: 'Manche terminée',
        sub: 'Place au décompte des points',
        accent: 'bg-indigo-400',
        tagClasses: 'text-indigo-300',
      }
    case 'game-finished':
      return {
        tag: 'Partie',
        headline: 'Partie terminée',
        sub: 'Le classement final est prêt',
        accent: 'bg-status-flip7',
        tagClasses: 'text-status-flip7',
      }
    default: {
      const _exhaustive: never = e
      return {
        tag: '',
        headline: String(_exhaustive),
        sub: '',
        accent: 'bg-slate-500',
        tagClasses: 'text-slate-400',
      }
    }
  }
})
</script>

<template>
  <output
    class="relative mx-4 mt-3 block overflow-hidden rounded-2xl bg-surface-raised pr-3 pl-4 ring-1 ring-surface-border"
  >
    <!-- Vertical accent bar on the left. -->
    <span class="absolute top-0 bottom-0 left-0 w-1" :class="style.accent" aria-hidden="true" />

    <div class="flex items-start justify-between gap-3 py-3">
      <div class="min-w-0 flex-1">
        <p
          class="flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase"
          :class="style.tagClasses"
        >
          <span aria-hidden="true">-</span>
          {{ style.tag }}
        </p>
        <h3 class="mt-1 truncate text-lg font-semibold text-slate-100">
          {{ style.headline }}
        </h3>
        <p class="mt-0.5 truncate text-sm text-slate-400">
          {{ style.sub }}
        </p>

        <!-- Card thumbnails when the event has cards to show. -->
        <div v-if="event.kind === 'second-chance-save'" class="mt-2.5 flex items-center gap-1.5">
          <CardView :card="event.duplicateCard" size="sm" />
          <span class="text-xs text-slate-600">+</span>
          <CardView :card="event.secondChanceCard" size="sm" />
        </div>
        <div v-else-if="event.kind === 'action-drawn'" class="mt-2.5 flex items-center gap-1.5">
          <CardView :card="event.card" size="sm" />
        </div>
      </div>

      <button
        type="button"
        class="-mr-1 -mt-1 shrink-0 rounded-lg p-1.5 text-slate-500 transition hover:bg-surface-overlay hover:text-slate-200"
        aria-label="Fermer la bannière"
        @click="$emit('dismiss')"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          class="size-4"
          aria-hidden="true"
        >
          <path
            d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
          />
        </svg>
      </button>
    </div>
  </output>
</template>
