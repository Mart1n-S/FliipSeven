<script setup lang="ts">
import Avatar from '@/presentation/components/Avatar.vue'

defineProps<{
  /** The pseudo of the player whose turn it currently is. */
  currentPseudo: string
  /** Disable both buttons (eg. pending action, between rounds...). */
  disabled?: boolean
}>()

const emit = defineEmits<{
  draw: []
  stay: []
}>()
</script>

<template>
  <footer
    class="sticky bottom-0 z-10 border-t border-surface-border bg-surface-base/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur"
  >
    <!-- Current player chip : avatar + pseudo + label.
         Keeps the eye on the right seat even when scrolled to the bottom
         of a long player list. -->
    <div class="mb-3 flex items-center justify-center gap-2">
      <Avatar :pseudo="currentPseudo" size="sm" :active="true" />
      <p class="text-xs tracking-wide text-text-tertiary uppercase">Au tour de</p>
      <p class="text-sm font-semibold text-text-primary">{{ currentPseudo }}</p>
    </div>

    <div class="flex gap-2">
      <button
        type="button"
        class="flex-1 rounded-xl bg-surface-raised px-4 py-3.5 text-base font-semibold text-text-primary ring-1 ring-surface-border transition hover:ring-slate-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:ring-surface-border"
        :disabled="disabled"
        @click="emit('stay')"
      >
        Stopper
      </button>
      <button
        type="button"
        class="flex-[1.2] rounded-xl bg-status-active px-4 py-3.5 text-base font-semibold text-text-inverse shadow-lg shadow-status-active/20 transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:brightness-100"
        :disabled="disabled"
        @click="emit('draw')"
      >
        Piocher
      </button>
    </div>
  </footer>
</template>
