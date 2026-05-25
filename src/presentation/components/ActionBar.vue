<script setup lang="ts">
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
    class="sticky bottom-0 z-10 border-t border-slate-800 bg-slate-900/95 px-4 py-3 backdrop-blur"
  >
    <p class="mb-2 text-center text-xs text-slate-400">
      Au tour de
      <span class="font-semibold text-indigo-300">{{ currentPseudo }}</span>
    </p>
    <div class="flex gap-2">
      <button
        type="button"
        class="flex-1 rounded-xl border border-slate-700 px-4 py-3 text-base font-semibold text-slate-200 transition hover:border-slate-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-700"
        :disabled="disabled"
        @click="emit('stay')"
      >
        Rester
      </button>
      <button
        type="button"
        class="flex-1 rounded-xl bg-indigo-500 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:bg-indigo-500"
        :disabled="disabled"
        @click="emit('draw')"
      >
        Tirer
      </button>
    </div>
  </footer>
</template>
