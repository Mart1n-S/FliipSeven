import { describe, expect, it } from 'vitest'
import type {
  Card,
  FlipThreeCard,
  FreezeCard,
  ModifierCard,
  NumberCard,
  SecondChanceCard,
} from '@/domain/entities/Card'
import { createPlayerRoundState, type PlayerRoundState } from '@/domain/entities/PlayerRoundState'
import {
  applyFlipThree,
  runFlipThreeDraws,
  type CardSource,
} from '@/domain/rules/actions/flipThree'
import { createCardId } from '@/domain/value-objects/CardId'
import type { ModifierKind } from '@/domain/value-objects/ModifierKind'
import type { NumberValue } from '@/domain/value-objects/NumberValue'
import { createPlayerId } from '@/domain/value-objects/PlayerId'
import type { PlayerStatus } from '@/domain/value-objects/PlayerStatus'

// ---------- helpers ----------

function makeNumber(value: NumberValue, index = 0): NumberCard {
  return { id: createCardId(`number-${value}-${index}`), kind: 'number', value }
}

function makeModifier(modifier: ModifierKind): ModifierCard {
  return { id: createCardId(`modifier-${modifier}`), kind: 'modifier', modifier }
}

function makeFreeze(index = 0): FreezeCard {
  return { id: createCardId(`action-freeze-${index}`), kind: 'action', action: 'freeze' }
}

function makeFlipThree(index = 0): FlipThreeCard {
  return {
    id: createCardId(`action-flip-three-${index}`),
    kind: 'action',
    action: 'flip-three',
  }
}

function makeSC(index = 0): SecondChanceCard {
  return {
    id: createCardId(`action-second-chance-${index}`),
    kind: 'action',
    action: 'second-chance',
  }
}

function activeState(): PlayerRoundState {
  return createPlayerRoundState(createPlayerId('p1'))
}

function makeDrawer(cards: readonly Card[]): CardSource {
  let i = 0
  return () => {
    if (i >= cards.length) return null
    const card = cards[i] as Card
    i += 1
    return card
  }
}

// ---------- applyFlipThree (atomic) ----------

describe('applyFlipThree (atomic)', () => {
  it('discards the card and returns drawsOwed = 3 without touching the state', () => {
    const card = makeFlipThree()
    const state = activeState()

    const outcome = applyFlipThree(state, card)

    expect(outcome.discarded).toEqual([card])
    expect(outcome.drawsOwed).toBe(3)
    expect(outcome.state).toBe(state)
  })

  it.each<PlayerStatus>(['stayed', 'busted', 'frozen', 'flip7'])(
    'throws when the target status is %s',
    (status) => {
      expect(() => applyFlipThree({ ...activeState(), status }, makeFlipThree())).toThrow(/active/)
    },
  )
})

// ---------- runFlipThreeDraws (orchestrator) ----------

describe('runFlipThreeDraws', () => {
  it('applies three unique number cards and stays active', () => {
    const cards = [makeNumber(1), makeNumber(2), makeNumber(3)]
    const outcome = runFlipThreeDraws(activeState(), makeDrawer(cards))

    expect(outcome.drawnCount).toBe(3)
    expect(outcome.state.numberCards).toHaveLength(3)
    expect(outcome.state.status).toBe<PlayerStatus>('active')
    expect(outcome.discarded).toEqual([])
    expect(outcome.pendingActions).toEqual([])
  })

  it('handles a mix of number and modifier cards', () => {
    const cards = [makeNumber(5), makeModifier('plus-4'), makeNumber(7)]
    const outcome = runFlipThreeDraws(activeState(), makeDrawer(cards))

    expect(outcome.drawnCount).toBe(3)
    expect(outcome.state.numberCards).toHaveLength(2)
    expect(outcome.state.modifiers).toHaveLength(1)
    expect(outcome.state.modifiers[0]?.modifier).toBe('plus-4')
  })

  it('stops drawing after a bust and never pulls the third card', () => {
    const third = makeNumber(9)
    const drawer = makeDrawer([makeNumber(5, 0), makeNumber(5, 1), third])

    const outcome = runFlipThreeDraws(activeState(), drawer)

    expect(outcome.state.status).toBe<PlayerStatus>('busted')
    expect(outcome.drawnCount).toBe(2)
    // the third card is still available on top of the deck
    expect(drawer()).toBe(third)
  })

  it('stops drawing as soon as the target reaches Flip 7', () => {
    const sixCards: NumberCard[] = [
      makeNumber(1),
      makeNumber(2),
      makeNumber(3),
      makeNumber(4),
      makeNumber(5),
      makeNumber(6),
    ]
    const state: PlayerRoundState = { ...activeState(), numberCards: sixCards }

    const drawer = makeDrawer([makeNumber(7), makeNumber(8), makeNumber(9)])
    const outcome = runFlipThreeDraws(state, drawer)

    expect(outcome.state.status).toBe<PlayerStatus>('flip7')
    expect(outcome.drawnCount).toBe(1)
  })

  it('queues action cards (Freeze, Flip Three, Second Chance) and keeps drawing', () => {
    const freeze = makeFreeze()
    const flipThree = makeFlipThree()
    const sc = makeSC()

    const outcome = runFlipThreeDraws(activeState(), makeDrawer([freeze, flipThree, sc]))

    expect(outcome.drawnCount).toBe(3)
    expect(outcome.pendingActions).toEqual([freeze, flipThree, sc])
    expect(outcome.state.numberCards).toEqual([])
    expect(outcome.state.modifiers).toEqual([])
    expect(outcome.state.secondChance).toBeNull()
  })

  it('lets Second Chance kick in if it is already on the slot when a duplicate is drawn', () => {
    const sc = makeSC()
    const state: PlayerRoundState = {
      ...activeState(),
      numberCards: [makeNumber(5, 0)],
      secondChance: sc,
    }

    const duplicate = makeNumber(5, 1)
    const outcome = runFlipThreeDraws(state, makeDrawer([duplicate, makeNumber(7), makeNumber(8)]))

    expect(outcome.state.status).toBe<PlayerStatus>('active')
    expect(outcome.state.secondChance).toBeNull()
    expect(outcome.state.numberCards).toHaveLength(3) // initial 5 + 7 + 8
    expect(outcome.drawnCount).toBe(3)
    expect(outcome.discarded).toEqual([duplicate, sc])
  })

  it('stops gracefully when the deck runs dry mid-sequence', () => {
    const outcome = runFlipThreeDraws(activeState(), makeDrawer([makeNumber(1)]))

    expect(outcome.drawnCount).toBe(1)
    expect(outcome.state.numberCards).toHaveLength(1)
  })

  it('respects a custom maxDraws parameter', () => {
    const cards = [makeNumber(1), makeNumber(2), makeNumber(3), makeNumber(4)]
    const outcome = runFlipThreeDraws(activeState(), makeDrawer(cards), 2)

    expect(outcome.drawnCount).toBe(2)
    expect(outcome.state.numberCards).toHaveLength(2)
  })
})
