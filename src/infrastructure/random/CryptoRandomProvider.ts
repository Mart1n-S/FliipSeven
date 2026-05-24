import type { RandomProvider } from '@/domain/ports/RandomProvider'

const UINT32_RANGE = 0x100000000 // 2 ** 32

/**
 * RandomProvider backed by the Web Crypto API (`crypto.getRandomValues`).
 *
 * Uses rejection sampling on a 32-bit unsigned integer so the returned
 * value is uniformly distributed in [0, maxExclusive) - a plain modulo
 * would bias the result toward the lower buckets whenever
 * `maxExclusive` does not divide 2^32 evenly.
 */
export class CryptoRandomProvider implements RandomProvider {
  nextInt(maxExclusive: number): number {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
      throw new Error(
        `CryptoRandomProvider.nextInt: maxExclusive must be a positive integer (got ${maxExclusive}).`,
      )
    }

    // Largest multiple of `maxExclusive` that fits in a uint32 + 1.
    // Any drawn value < limit can be safely reduced with % maxExclusive
    // without introducing modulo bias.
    const limit = UINT32_RANGE - (UINT32_RANGE % maxExclusive)
    const buf = new Uint32Array(1)

    let value: number
    do {
      crypto.getRandomValues(buf)
      value = buf[0] as number
    } while (value >= limit)

    return value % maxExclusive
  }
}
