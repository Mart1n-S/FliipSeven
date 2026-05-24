import type { RandomProvider } from '@/domain/ports/RandomProvider'

/**
 * Returns a new array shuffled via Fisher-Yates.
 * The input array is not mutated.
 */
export function shuffle<T>(items: readonly T[], rng: RandomProvider): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1)
    const tmp = result[i] as T
    result[i] = result[j] as T
    result[j] = tmp
  }
  return result
}
