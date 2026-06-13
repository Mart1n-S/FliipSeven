<script setup lang="ts">
import type { Player } from '@/domain/entities/Player'
import Avatar from '@/presentation/components/Avatar.vue'
import ThemeToggle from '@/presentation/components/ThemeToggle.vue'
import rulesPdfUrl from '@/presentation/assets/rules/Rules-FliipSeven.pdf?url'

defineProps<{
  roundNumber: number
  dealer: Player | null
  deckSize: number
  discardSize: number
}>()

defineEmits<{
  quit: []
  history: []
}>()
</script>

<template>
  <header
    class="sticky top-0 z-10 border-b border-surface-border bg-surface-base/95 px-4 pt-3 pb-4 backdrop-blur"
  >
    <!-- Top row : Manche + Donneur + icon buttons -->
    <div class="flex items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-2">
        <span
          class="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-surface-raised px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase ring-1 ring-surface-border"
        >
          <span class="text-text-tertiary">Manche</span>
          <span class="font-mono text-text-primary tabular-nums">{{
            roundNumber.toString().padStart(2, '0')
          }}</span>
        </span>

        <div v-if="dealer" class="flex min-w-0 items-center gap-1.5">
          <span class="hidden shrink-0 text-[11px] text-text-tertiary sm:inline">Donneur</span>
          <!-- Mobile: just the dealer's initials (no pill) to save width. -->
          <Avatar
            :pseudo="dealer.pseudo"
            size="sm"
            class="sm:hidden"
            :title="`Donneur : ${dealer.pseudo}`"
          />
          <!-- >= sm: full pill with the dealer's pseudo. -->
          <span
            class="hidden min-w-0 items-center gap-1.5 rounded-full bg-surface-raised py-0.5 pr-3 pl-0.5 ring-1 ring-surface-border sm:inline-flex"
          >
            <Avatar :pseudo="dealer.pseudo" size="sm" />
            <span class="truncate text-xs font-medium text-text-primary">{{ dealer.pseudo }}</span>
          </span>
        </div>
      </div>

      <div class="flex shrink-0 items-center gap-1">
        <button
          type="button"
          class="rounded-lg p-2 text-text-secondary transition hover:bg-surface-raised hover:text-text-primary"
          aria-label="Voir l'historique de la partie"
          @click="$emit('history')"
        >
          <!-- 3 horizontal lines -->
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            class="size-5"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              d="M2 5.75A.75.75 0 0 1 2.75 5h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 5.75ZM2 10a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm.75 3.5a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5h-7.5Z"
              clip-rule="evenodd"
            />
          </svg>
        </button>

        <a
          :href="rulesPdfUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="rounded-lg p-2 text-text-secondary transition hover:bg-surface-raised hover:text-text-primary"
          aria-label="Ouvrir le PDF des règles"
        >
          <!-- info (i) -->
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            class="size-5"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z"
              clip-rule="evenodd"
            />
          </svg>
        </a>

        <ThemeToggle />

        <button
          type="button"
          class="rounded-lg p-2 text-text-secondary transition hover:bg-surface-raised hover:text-status-busted-text"
          aria-label="Quitter la partie"
          @click="$emit('quit')"
        >
          <!-- X -->
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            class="size-5"
            aria-hidden="true"
          >
            <path
              d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Stats tiles : pioche + défausse -->
    <div class="mt-3 grid grid-cols-2 gap-2">
      <div
        class="relative overflow-hidden rounded-xl bg-surface-raised px-3 py-2.5 ring-1 ring-surface-border"
      >
        <p class="text-[10px] font-semibold tracking-wider text-text-tertiary uppercase">Pioche</p>
        <p class="mt-0.5 font-mono text-2xl font-bold text-text-primary tabular-nums">
          {{ deckSize }}
        </p>
        <!-- card silhouette -->
        <svg
          class="absolute top-1.5 right-2 size-8 text-text-quaternary"
          viewBox="0 0 24 32"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          aria-hidden="true"
        >
          <rect x="1" y="1" width="22" height="30" rx="3" />
        </svg>
      </div>

      <div
        class="relative overflow-hidden rounded-xl bg-surface-raised px-3 py-2.5 ring-1 ring-surface-border"
      >
        <p class="text-[10px] font-semibold tracking-wider text-text-tertiary uppercase">
          Défausse
        </p>
        <p class="mt-0.5 font-mono text-2xl font-bold text-text-primary tabular-nums">
          {{ discardSize }}
        </p>
        <svg
          class="absolute top-1.5 right-2 size-8 text-text-quaternary"
          viewBox="0 0 24 32"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="20" height="28" rx="3" />
          <rect x="1" y="1" width="20" height="28" rx="3" />
        </svg>
      </div>
    </div>
  </header>
</template>
