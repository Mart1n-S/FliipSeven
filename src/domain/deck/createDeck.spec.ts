import { describe, expect, it } from 'vitest'
import { createDeck } from '@/domain/deck/createDeck'
import { isActionCard, isModifierCard, isNumberCard, type Card } from '@/domain/entities/Card'
import { ACTION_KINDS } from '@/domain/value-objects/ActionKind'
import { MODIFIER_KINDS } from '@/domain/value-objects/ModifierKind'
import { NUMBER_VALUES, type NumberValue } from '@/domain/value-objects/NumberValue'

function countBy<T, K extends string | number>(
  items: readonly T[],
  key: (item: T) => K,
): Map<K, number> {
  const counts = new Map<K, number>()
  for (const item of items) {
    const k = key(item)
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  return counts
}

describe('createDeck', () => {
  const deck: readonly Card[] = createDeck()

  it('contains exactly 94 cards', () => {
    expect(deck).toHaveLength(94)
  })

  it('contains the right number of cards per kind (79 / 6 / 9)', () => {
    expect(deck.filter(isNumberCard)).toHaveLength(79)
    expect(deck.filter(isModifierCard)).toHaveLength(6)
    expect(deck.filter(isActionCard)).toHaveLength(9)
  })

  it('has the exact number of copies per number value (0×1, 1×1, 2×2, ..., 12×12)', () => {
    const counts = countBy(deck.filter(isNumberCard), (c) => c.value)

    const expected: Record<NumberValue, number> = {
      0: 1,
      1: 1,
      2: 2,
      3: 3,
      4: 4,
      5: 5,
      6: 6,
      7: 7,
      8: 8,
      9: 9,
      10: 10,
      11: 11,
      12: 12,
    }

    for (const value of NUMBER_VALUES) {
      expect(counts.get(value) ?? 0).toBe(expected[value])
    }
  })

  it('has exactly one copy of each modifier card', () => {
    const counts = countBy(deck.filter(isModifierCard), (c) => c.modifier)

    for (const modifier of MODIFIER_KINDS) {
      expect(counts.get(modifier) ?? 0).toBe(1)
    }
  })

  it('has exactly three copies of each action card', () => {
    const counts = countBy(deck.filter(isActionCard), (c) => c.action)

    for (const action of ACTION_KINDS) {
      expect(counts.get(action) ?? 0).toBe(3)
    }
  })

  it('gives every card a unique id', () => {
    const ids = deck.map((c) => c.id)
    expect(new Set(ids).size).toBe(deck.length)
  })

  it('returns a fresh array on every call (no shared state)', () => {
    const a = createDeck()
    const b = createDeck()

    expect(a).not.toBe(b)
    expect(a).toEqual(b)
  })
})
