<script setup lang="ts">
import { computed } from 'vue'
import type { ActionCard } from '@/domain/entities/Card'
import Avatar from '@/presentation/components/Avatar.vue'
import CardView from '@/presentation/components/CardView.vue'
import type { TargetChoice } from '@/presentation/composables/useActionResolution'

const props = defineProps<{
  card: ActionCard
  originPseudo: string
  choices: readonly TargetChoice[]
}>()

defineEmits<{
  select: [index: number]
}>()

interface Prompt {
  readonly title: string
  readonly subtitle: string
  readonly cardLabel: string
}

const promptByAction = computed<Prompt>(() => {
  const action = props.card.action
  switch (action) {
    case 'freeze':
      return {
        title: 'Cibler un joueur',
        subtitle: `${props.originPseudo} doit choisir qui geler`,
        cardLabel: 'Carte Gel · ses points du tour sont perdus',
      }
    case 'flip-three':
      return {
        title: 'Cibler un joueur',
        subtitle: `${props.originPseudo} doit choisir qui pioche 3 cartes`,
        cardLabel: 'Carte Trois à la Suite · 3 cartes forcées',
      }
    case 'second-chance':
      return {
        title: 'Donner la Seconde Chance',
        subtitle: `${props.originPseudo} doit transmettre sa Seconde Chance`,
        cardLabel: 'Carte Seconde Chance · protège d’un doublon',
      }
    default: {
      const _exhaustive: never = action
      return { title: String(_exhaustive), subtitle: '', cardLabel: '' }
    }
  }
})
</script>

<template>
  <div
    class="fixed inset-0 z-30 flex items-end justify-center bg-slate-950/70 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    :aria-label="promptByAction.title"
  >
    <div
      class="flex max-h-[85vh] w-full max-w-md flex-col rounded-t-3xl border-t border-x border-surface-border bg-surface-base pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl"
    >
      <!-- Drag handle (purely decorative on web; no swipe-to-dismiss). -->
      <div class="flex shrink-0 justify-center pt-2.5 pb-1">
        <span class="block h-1 w-10 rounded-full bg-surface-border" aria-hidden="true" />
      </div>

      <header class="flex shrink-0 items-start gap-3 px-5 pt-3 pb-4">
        <CardView :card="card" size="md" />
        <div class="min-w-0 flex-1">
          <h2 class="truncate text-lg font-semibold text-text-primary">
            {{ promptByAction.title }}
          </h2>
          <p class="mt-0.5 truncate text-sm text-text-secondary">
            {{ promptByAction.subtitle }}
          </p>
          <p class="mt-1.5 text-xs text-text-tertiary">
            {{ promptByAction.cardLabel }}
          </p>
        </div>
      </header>

      <!-- Scrollable so every seat is reachable even with 18 players.
           pt-1 keeps the first item's ring / focus outline from being
           clipped by the scroll container's top edge. -->
      <ul class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 pt-1 pb-3">
        <li v-for="choice in choices" :key="choice.index">
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-xl bg-surface-raised px-3 py-3 text-left ring-1 ring-surface-border transition hover:bg-surface-overlay hover:ring-status-active active:scale-[0.99]"
            @click="$emit('select', choice.index)"
          >
            <Avatar :pseudo="choice.pseudo" size="sm" />
            <span class="flex-1 truncate text-sm font-medium text-text-primary">{{
              choice.pseudo
            }}</span>
            <span class="font-mono text-sm font-semibold text-text-secondary tabular-nums">
              {{ choice.roundScore }}
            </span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
