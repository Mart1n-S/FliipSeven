import { describe, expect, it } from 'vitest'
import { CryptoRandomProvider } from '@/infrastructure/random/CryptoRandomProvider'

describe('CryptoRandomProvider', () => {
  const rng = new CryptoRandomProvider()

  it('always returns 0 when maxExclusive is 1', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(rng.nextInt(1)).toBe(0)
    }
  })

  it('returns integers in [0, maxExclusive) for several thousand draws', () => {
    const max = 13
    for (let i = 0; i < 5000; i += 1) {
      const value = rng.nextInt(max)
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(max)
    }
  })

  it('actually reaches both ends of the range over many draws', () => {
    let seenZero = false
    let seenMax = false
    for (let i = 0; i < 2000 && !(seenZero && seenMax); i += 1) {
      const value = rng.nextInt(5)
      if (value === 0) seenZero = true
      if (value === 4) seenMax = true
    }
    expect(seenZero).toBe(true)
    expect(seenMax).toBe(true)
  })

  it.each([
    ['zero', 0],
    ['negative', -1],
    ['float', 3.5],
    ['NaN', NaN],
  ])('throws when maxExclusive is %s', (_label, value) => {
    expect(() => rng.nextInt(value)).toThrow(/positive integer/)
  })
})
