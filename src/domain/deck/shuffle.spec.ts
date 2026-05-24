import { describe, expect, it } from 'vitest'
import type { RandomProvider } from '@/domain/ports/RandomProvider'
import { shuffle } from '@/domain/deck/shuffle'

class FixedSequenceRandomProvider implements RandomProvider {
  private cursor = 0

  constructor(private readonly sequence: readonly number[]) {}

  nextInt(maxExclusive: number): number {
    const raw = this.sequence[this.cursor]
    if (raw === undefined) {
      throw new Error('FixedSequenceRandomProvider: sequence exhausted')
    }
    this.cursor += 1
    return raw % maxExclusive
  }
}

class ConstantRandomProvider implements RandomProvider {
  constructor(private readonly value: number) {}

  nextInt(maxExclusive: number): number {
    return this.value % maxExclusive
  }
}

describe('shuffle (Fisher-Yates)', () => {
  it('returns an array with the same length', () => {
    const input = [1, 2, 3, 4, 5]
    const result = shuffle(input, new ConstantRandomProvider(0))

    expect(result).toHaveLength(input.length)
  })

  it('preserves the multiset of elements', () => {
    const input = [1, 2, 3, 4, 5]
    const result = shuffle(input, new ConstantRandomProvider(0))

    expect([...result].sort()).toEqual([...input].sort())
  })

  it('does not mutate the input array', () => {
    const input = [1, 2, 3, 4, 5]
    const snapshot = [...input]

    shuffle(input, new ConstantRandomProvider(0))

    expect(input).toEqual(snapshot)
  })

  it('returns the empty array when input is empty', () => {
    expect(shuffle([], new ConstantRandomProvider(0))).toEqual([])
  })

  it('returns the single element unchanged for a length-1 input', () => {
    expect(shuffle(['only'], new ConstantRandomProvider(0))).toEqual(['only'])
  })

  it('is deterministic for a given RandomProvider sequence', () => {
    const input = [0, 1, 2, 3, 4]
    // For length 5, Fisher-Yates calls nextInt(5), nextInt(4), nextInt(3), nextInt(2).
    const rngA = new FixedSequenceRandomProvider([2, 1, 0, 1])
    const rngB = new FixedSequenceRandomProvider([2, 1, 0, 1])

    expect(shuffle(input, rngA)).toEqual(shuffle(input, rngB))
  })

  it('produces a known permutation when rng always returns 0', () => {
    // With nextInt always 0, each iteration swaps result[i] with result[0],
    // which rotates the array.
    const result = shuffle([0, 1, 2, 3, 4], new ConstantRandomProvider(0))
    expect(result).toEqual([1, 2, 3, 4, 0])
  })
})
