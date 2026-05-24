import { describe, expect, it } from 'vitest'
import type { ModifierCard, NumberCard } from '@/domain/entities/Card'
import { createPlayerRoundState, type PlayerRoundState } from '@/domain/entities/PlayerRoundState'
import { calculateRoundScore } from '@/domain/rules/score'
import { createCardId } from '@/domain/value-objects/CardId'
import type { ModifierKind } from '@/domain/value-objects/ModifierKind'
import type { NumberValue } from '@/domain/value-objects/NumberValue'
import { createPlayerId } from '@/domain/value-objects/PlayerId'
import type { PlayerStatus } from '@/domain/value-objects/PlayerStatus'

function makeNumber(value: NumberValue, index = 0): NumberCard {
  return { id: createCardId(`number-${value}-${index}`), kind: 'number', value }
}

function makeModifier(modifier: ModifierKind): ModifierCard {
  return { id: createCardId(`modifier-${modifier}`), kind: 'modifier', modifier }
}

function makeState(overrides: Partial<PlayerRoundState> = {}): PlayerRoundState {
  return { ...createPlayerRoundState(createPlayerId('p1')), ...overrides }
}

describe('calculateRoundScore', () => {
  // ---------- examples taken straight from the PDF ----------

  it('PDF: [11, 5, 12] + +4 = 32', () => {
    const state = makeState({
      numberCards: [makeNumber(11), makeNumber(5), makeNumber(12)],
      modifiers: [makeModifier('plus-4')],
      status: 'stayed',
    })

    const breakdown = calculateRoundScore(state)

    expect(breakdown.numberSum).toBe(28)
    expect(breakdown.multipliedSum).toBe(28)
    expect(breakdown.additiveBonuses).toBe(4)
    expect(breakdown.flip7Bonus).toBe(0)
    expect(breakdown.total).toBe(32)
  })

  it('PDF: [3, 11, 5, 7, 10] = 36 (no modifier)', () => {
    const state = makeState({
      numberCards: [makeNumber(3), makeNumber(11), makeNumber(5), makeNumber(7), makeNumber(10)],
      status: 'stayed',
    })

    expect(calculateRoundScore(state).total).toBe(36)
  })

  it('PDF: [3, 11, 5, 7, 10] with x2 = 72', () => {
    const state = makeState({
      numberCards: [makeNumber(3), makeNumber(11), makeNumber(5), makeNumber(7), makeNumber(10)],
      modifiers: [makeModifier('fois-2')],
      status: 'stayed',
    })

    expect(calculateRoundScore(state).total).toBe(72)
  })

  it('PDF: [3, 11, 5, 7, 10] with +10 = 46 (no doubling on bonuses)', () => {
    const state = makeState({
      numberCards: [makeNumber(3), makeNumber(11), makeNumber(5), makeNumber(7), makeNumber(10)],
      modifiers: [makeModifier('plus-10')],
      status: 'stayed',
    })

    expect(calculateRoundScore(state).total).toBe(46)
  })

  it('PDF: Flip 7 with [3, 11, 5, 7, 10, 9, 4] = 49 + 15 = 64', () => {
    const state = makeState({
      numberCards: [
        makeNumber(3),
        makeNumber(11),
        makeNumber(5),
        makeNumber(7),
        makeNumber(10),
        makeNumber(9),
        makeNumber(4),
      ],
      status: 'flip7',
    })

    const breakdown = calculateRoundScore(state)

    expect(breakdown.numberSum).toBe(49)
    expect(breakdown.flip7Bonus).toBe(15)
    expect(breakdown.total).toBe(64)
  })

  // ---------- combined / edge cases ----------

  it('stacks x2 with additive bonuses: 36 → ×2 = 72 then +10 = 82', () => {
    const state = makeState({
      numberCards: [makeNumber(3), makeNumber(11), makeNumber(5), makeNumber(7), makeNumber(10)],
      modifiers: [makeModifier('fois-2'), makeModifier('plus-10')],
      status: 'stayed',
    })

    expect(calculateRoundScore(state).total).toBe(82)
  })

  it('handles the 0 card: doubles to 0, but additive bonuses still count', () => {
    const state = makeState({
      numberCards: [makeNumber(0), makeNumber(1)],
      modifiers: [makeModifier('fois-2'), makeModifier('plus-4')],
      status: 'stayed',
    })

    // (0+1) * 2 + 4 = 6
    expect(calculateRoundScore(state).total).toBe(6)
  })

  it('Flip 7 with x2 and bonus: numbers + x2 + bonus + 15', () => {
    const state = makeState({
      numberCards: [
        makeNumber(1),
        makeNumber(2),
        makeNumber(3),
        makeNumber(4),
        makeNumber(5),
        makeNumber(6),
        makeNumber(7),
      ],
      modifiers: [makeModifier('fois-2'), makeModifier('plus-2')],
      status: 'flip7',
    })

    // 28 * 2 + 2 + 15 = 73
    expect(calculateRoundScore(state).total).toBe(73)
  })

  it('returns 0 for a busted player even with cards on the row', () => {
    const state = makeState({
      numberCards: [makeNumber(12), makeNumber(11)],
      modifiers: [makeModifier('plus-10')],
      status: 'busted',
    })

    expect(calculateRoundScore(state).total).toBe(0)
  })

  it('returns 0 for a frozen player even with cards on the row', () => {
    const state = makeState({
      numberCards: [makeNumber(12), makeNumber(11)],
      modifiers: [makeModifier('plus-10')],
      status: 'frozen',
    })

    expect(calculateRoundScore(state).total).toBe(0)
  })

  it('scores an active player as a preview (no Flip 7 bonus while still drawing)', () => {
    const state = makeState({
      numberCards: [makeNumber(7), makeNumber(8)],
      modifiers: [makeModifier('plus-2')],
      status: 'active',
    })

    expect(calculateRoundScore(state).total).toBe(17)
  })

  it('returns 0 for an empty state (no cards yet)', () => {
    expect(calculateRoundScore(makeState()).total).toBe(0)
  })

  it.each<PlayerStatus>(['active', 'stayed', 'flip7'])(
    'returns a non-zero score for status %s when cards are present',
    (status) => {
      const state = makeState({
        numberCards: [makeNumber(5)],
        status,
      })

      const expected = status === 'flip7' ? 5 + 15 : 5
      expect(calculateRoundScore(state).total).toBe(expected)
    },
  )

  it('does not mutate the input state', () => {
    const state = makeState({
      numberCards: [makeNumber(5)],
      modifiers: [makeModifier('fois-2')],
      status: 'stayed',
    })
    const snapshot = structuredClone(state)

    calculateRoundScore(state)

    expect(state).toEqual(snapshot)
  })
})
