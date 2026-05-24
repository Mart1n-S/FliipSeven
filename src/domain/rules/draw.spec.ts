import { describe, expect, it } from 'vitest'
import { type ModifierCard, type NumberCard, type SecondChanceCard } from '@/domain/entities/Card'
import { createPlayerRoundState, type PlayerRoundState } from '@/domain/entities/PlayerRoundState'
import { drawModifier, drawNumberCard } from '@/domain/rules/draw'
import { createCardId } from '@/domain/value-objects/CardId'
import type { ModifierKind } from '@/domain/value-objects/ModifierKind'
import type { NumberValue } from '@/domain/value-objects/NumberValue'
import { createPlayerId } from '@/domain/value-objects/PlayerId'
import type { PlayerStatus } from '@/domain/value-objects/PlayerStatus'

function makeNumberCard(value: NumberValue, index = 0): NumberCard {
  return {
    id: createCardId(`number-${value}-${index}`),
    kind: 'number',
    value,
  }
}

function makeModifierCard(modifier: ModifierKind): ModifierCard {
  return {
    id: createCardId(`modifier-${modifier}`),
    kind: 'modifier',
    modifier,
  }
}

function makeSecondChance(index = 0): SecondChanceCard {
  return {
    id: createCardId(`action-second-chance-${index}`),
    kind: 'action',
    action: 'second-chance',
  }
}

function emptyState(): PlayerRoundState {
  return createPlayerRoundState(createPlayerId('p1'))
}

function stateWith(overrides: Partial<PlayerRoundState>): PlayerRoundState {
  return { ...emptyState(), ...overrides }
}

describe('drawNumberCard', () => {
  it('appends the card to the row and keeps the player active', () => {
    const result = drawNumberCard(emptyState(), makeNumberCard(5))

    expect(result.state.numberCards).toHaveLength(1)
    expect(result.state.numberCards[0]?.value).toBe(5)
    expect(result.state.status).toBe<PlayerStatus>('active')
    expect(result.discarded).toEqual([])
  })

  it('promotes status to `flip7` when the 7th unique card lands', () => {
    const sixCards: NumberCard[] = [
      makeNumberCard(1),
      makeNumberCard(2),
      makeNumberCard(3),
      makeNumberCard(4),
      makeNumberCard(5),
      makeNumberCard(6),
    ]
    const state = stateWith({ numberCards: sixCards })

    const result = drawNumberCard(state, makeNumberCard(7))

    expect(result.state.numberCards).toHaveLength(7)
    expect(result.state.status).toBe<PlayerStatus>('flip7')
  })

  it('busts on a duplicate without Second Chance, keeping the card on the row', () => {
    const state = stateWith({ numberCards: [makeNumberCard(5, 0)] })

    const duplicate = makeNumberCard(5, 1)
    const result = drawNumberCard(state, duplicate)

    expect(result.state.status).toBe<PlayerStatus>('busted')
    expect(result.state.numberCards).toHaveLength(2)
    expect(result.state.numberCards[1]).toBe(duplicate)
    expect(result.discarded).toEqual([])
  })

  it('uses Second Chance on a duplicate: discards both, keeps player active', () => {
    const sc = makeSecondChance()
    const state = stateWith({
      numberCards: [makeNumberCard(5, 0)],
      secondChance: sc,
    })

    const duplicate = makeNumberCard(5, 1)
    const result = drawNumberCard(state, duplicate)

    expect(result.state.status).toBe<PlayerStatus>('active')
    expect(result.state.numberCards).toHaveLength(1)
    expect(result.state.secondChance).toBeNull()
    expect(result.discarded).toEqual([duplicate, sc])
  })

  it('busts on a duplicate that would have been the 7th card', () => {
    const sixCards: NumberCard[] = [
      makeNumberCard(1),
      makeNumberCard(2),
      makeNumberCard(3),
      makeNumberCard(4),
      makeNumberCard(5),
      makeNumberCard(6),
    ]
    const state = stateWith({ numberCards: sixCards })

    const result = drawNumberCard(state, makeNumberCard(6, 1))

    expect(result.state.status).toBe<PlayerStatus>('busted')
  })

  it.each<PlayerStatus>(['stayed', 'busted', 'frozen', 'flip7'])(
    'throws when the player status is %s',
    (status) => {
      const state = stateWith({ status })

      expect(() => drawNumberCard(state, makeNumberCard(3))).toThrow(/not active/)
    },
  )

  it('does not mutate the input state', () => {
    const state = emptyState()
    const snapshot = structuredClone(state)

    drawNumberCard(state, makeNumberCard(5))

    expect(state).toEqual(snapshot)
  })
})

describe('drawModifier', () => {
  it('appends the modifier and leaves the rest unchanged', () => {
    const state = stateWith({ numberCards: [makeNumberCard(7)] })

    const result = drawModifier(state, makeModifierCard('plus-4'))

    expect(result.state.modifiers).toHaveLength(1)
    expect(result.state.modifiers[0]?.modifier).toBe('plus-4')
    expect(result.state.numberCards).toHaveLength(1)
    expect(result.state.status).toBe<PlayerStatus>('active')
    expect(result.discarded).toEqual([])
  })

  it('throws when the player is not active', () => {
    const state = stateWith({ status: 'busted' })

    expect(() => drawModifier(state, makeModifierCard('fois-2'))).toThrow(/not active/)
  })

  it('does not mutate the input state', () => {
    const state = emptyState()
    const snapshot = structuredClone(state)

    drawModifier(state, makeModifierCard('plus-10'))

    expect(state).toEqual(snapshot)
  })
})
