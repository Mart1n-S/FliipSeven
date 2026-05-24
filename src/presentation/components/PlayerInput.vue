<script setup lang="ts">
defineProps<{
  modelValue: string
  index: number
  canRemove: boolean
  autofocus?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  remove: []
}>()

function onInput(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div class="flex items-center gap-2">
    <span
      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-sm font-semibold text-slate-400"
      :aria-label="`Joueur ${index + 1}`"
    >
      {{ index + 1 }}
    </span>

    <input
      type="text"
      :value="modelValue"
      :placeholder="`Joueur ${index + 1}`"
      :autofocus="autofocus"
      maxlength="20"
      autocomplete="off"
      autocapitalize="words"
      spellcheck="false"
      class="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-base text-slate-100 placeholder-slate-500 transition focus:border-indigo-400 focus:outline-none"
      @input="onInput"
    />

    <button
      v-if="canRemove"
      type="button"
      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-400 transition hover:border-rose-500 hover:text-rose-400"
      :aria-label="`Retirer le joueur ${index + 1}`"
      @click="emit('remove')"
    >
      &times;
    </button>
  </div>
</template>
