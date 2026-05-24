<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useGameStore } from '@/presentation/stores/gameStore'

const store = useGameStore()

onMounted(() => {
  store.loadFromStorage()
})
</script>

<template>
  <RouterView />
</template>
