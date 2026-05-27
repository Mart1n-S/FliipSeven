import { ref, watch } from 'vue'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'flip7:theme'

/**
 * Read the theme that the inline init script in `index.html` already
 * applied to `<html data-theme>`. Falls back to OS preference if the
 * attribute is missing (defensive - it should always be set).
 */
function readInitialTheme(): Theme {
  const fromHtml = document.documentElement.dataset.theme
  if (fromHtml === 'light' || fromHtml === 'dark') return fromHtml
  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Module-scoped singleton: ref + DOM-sync watcher are initialised
 * eagerly so every component imports the SAME reactive source and
 * reflects toggles instantly. A lazy `useTheme()`-time init was
 * fragile under HMR because each module re-evaluation produced a new
 * ref while old component instances kept reading the previous one.
 */
const themeRef = ref<Theme>(readInitialTheme())

watch(themeRef, (next) => {
  document.documentElement.dataset.theme = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch (storageErr) {
    // Private mode / disabled storage: keep the in-memory value, the
    // user can keep toggling but it won't survive reloads.
    if (import.meta.env.DEV) console.debug('flip7: theme persist failed', storageErr)
  }
})

/**
 * Reactive theme + helpers. The `theme` ref is shared across every
 * caller, so any component that reads `theme.value` re-renders the
 * moment {@link toggleTheme} (or any other mutation) fires.
 */
export function useTheme() {
  function toggleTheme(): void {
    themeRef.value = themeRef.value === 'dark' ? 'light' : 'dark'
  }

  function setTheme(theme: Theme): void {
    themeRef.value = theme
  }

  return {
    theme: themeRef,
    toggleTheme,
    setTheme,
  }
}
