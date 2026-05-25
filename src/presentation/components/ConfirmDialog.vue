<script setup lang="ts">
import { useEventListener } from '@vueuse/core'

const props = withDefaults(
  defineProps<{
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    /** Style the confirm button as destructive (rose) instead of primary (indigo). */
    destructive?: boolean
  }>(),
  {
    confirmLabel: 'Confirmer',
    cancelLabel: 'Annuler',
    destructive: false,
  },
)

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

// ESC = cancel (standard expectation for confirmation dialogs).
useEventListener(window, 'keydown', (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('cancel')
  }
})

// Avoid an eslint warning while still using the typed props in template.
void props
</script>

<template>
  <div
    class="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/80 p-4 backdrop-blur-sm sm:items-center"
    role="dialog"
    aria-modal="true"
    :aria-label="title"
  >
    <div class="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
      <h2 class="text-base font-semibold text-slate-100">{{ title }}</h2>
      <p class="mt-2 text-sm text-slate-400">{{ message }}</p>

      <div class="mt-5 flex gap-2">
        <button
          type="button"
          class="flex-1 rounded-xl border border-slate-700 px-4 py-3 text-base font-semibold text-slate-200 transition hover:border-slate-500 active:scale-95"
          @click="emit('cancel')"
        >
          {{ cancelLabel }}
        </button>
        <button
          type="button"
          class="flex-1 rounded-xl px-4 py-3 text-base font-semibold text-white shadow-lg transition active:scale-95"
          :class="
            destructive
              ? 'bg-rose-500 shadow-rose-500/30 hover:bg-rose-400'
              : 'bg-indigo-500 shadow-indigo-500/30 hover:bg-indigo-400'
          "
          @click="emit('confirm')"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>
