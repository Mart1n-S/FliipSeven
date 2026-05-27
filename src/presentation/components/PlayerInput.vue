<script setup lang="ts">
import { computed } from 'vue'
import Avatar from '@/presentation/components/Avatar.vue'

const props = defineProps<{
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

/**
 * Show the live initials as soon as the user types, or fall back to
 * the seat number while the field is empty. Mirrors the in-game
 * avatar so the player can preview how their seat will look.
 */
const avatarSeed = computed(() => {
  const trimmed = props.modelValue.trim()
  return trimmed.length > 0 ? trimmed : `${props.index + 1}`
})
</script>

<template>
  <div class="flex items-center gap-2">
    <Avatar :pseudo="avatarSeed" size="md" />

    <input
      type="text"
      :value="modelValue"
      :placeholder="`Joueur ${index + 1}`"
      :autofocus="autofocus"
      maxlength="20"
      autocomplete="off"
      autocapitalize="words"
      spellcheck="false"
      class="flex-1 rounded-lg bg-surface-raised px-3 py-2.5 text-base text-text-primary ring-1 ring-surface-border placeholder:text-text-tertiary focus:ring-2 focus:ring-status-active focus:outline-none"
      @input="onInput"
    />

    <button
      v-if="canRemove"
      type="button"
      class="flex size-10 shrink-0 items-center justify-center rounded-lg text-text-tertiary ring-1 ring-surface-border transition hover:bg-surface-raised hover:text-status-busted hover:ring-status-busted/40"
      :aria-label="`Retirer le joueur ${index + 1}`"
      @click="emit('remove')"
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
</template>
