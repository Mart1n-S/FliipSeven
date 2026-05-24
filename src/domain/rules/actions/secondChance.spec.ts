import { describe, expect, it } from 'vitest'
import type { SecondChanceCard } from '@/domain/entities/Card'
import { createPlayerRoundState, type PlayerRoundState } from '@/domain/entities/PlayerRoundState'
import { clearAllSecondChances, placeSecondChance } from '@/domain/rules/actions/secondChance'
import { createCardId } from '@/domain/value-objects/CardId'
import { createPlayerId } from '@/domain/value-objects/PlayerId'
import type { PlayerStatus } from '@/domain/value-objects/PlayerStatus'

function makeSC(index = 0): SecondChanceCard {
  return {
    id: createCardId(`action-second-chance-${index}`),
    kind: 'action',
    action: 'second-chance',
  }
}

function activeState(id = 'p1'): PlayerRoundState {
  return createPlayerRoundState(createPlayerId(id))
}

describe('placeSecondChance', () => {
  it('places the card on a fresh active player', () => {
    const card = makeSC()
    const result = placeSecondChance(activeState(), card)

    expect(result.secondChance).toBe(card)
    expect(result.status).toBe<PlayerStatus>('active')
  })

  it('throws when the target already holds a Second Chance', () => {
    const state: PlayerRoundState = { ...activeState(), secondChance: makeSC(0) }

    expect(() => placeSecondChance(state, makeSC(1))).toThrow(/already holds/)
  })

  it.each<PlayerStatus>(['stayed', 'busted', 'frozen', 'flip7'])(
    'throws when the target status is %s',
    (status) => {
      const state: PlayerRoundState = { ...activeState(), status }

      expect(() => placeSecondChance(state, makeSC())).toThrow(/active/)
    },
  )

  it('does not mutate the input state', () => {
    const state = activeState()
    const snapshot = structuredClone(state)

    placeSecondChance(state, makeSC())

    expect(state).toEqual(snapshot)
  })
})

describe('clearAllSecondChances', () => {
  it('returns every Second Chance card and clears the slots', () => {
    const sc1 = makeSC(0)
    const sc2 = makeSC(1)

    const states: PlayerRoundState[] = [
      { ...activeState('p1'), secondChance: sc1 },
      { ...activeState('p2') },
      { ...activeState('p3'), secondChance: sc2, status: 'busted' },
    ]

    const result = clearAllSecondChances(states)

    expect(result.discarded).toEqual([sc1, sc2])
    expect(result.states.map((s) => s.secondChance)).toEqual([null, null, null])
  })

  it('preserves player order and other fields', () => {
    const states: PlayerRoundState[] = [
      { ...activeState('p1'), secondChance: makeSC() },
      activeState('p2'),
    ]

    const result = clearAllSecondChances(states)

    expect(result.states.map((s) => s.playerId)).toEqual([states[0]!.playerId, states[1]!.playerId])
  })

  it('is a no-op (and returns no discards) when nobody holds a Second Chance', () => {
    const states: PlayerRoundState[] = [activeState('p1'), activeState('p2')]

    const result = clearAllSecondChances(states)

    expect(result.discarded).toEqual([])
    expect(result.states).toEqual(states)
  })

  it('does not mutate the input states', () => {
    const states: PlayerRoundState[] = [{ ...activeState('p1'), secondChance: makeSC() }]
    const snapshot = structuredClone(states)

    clearAllSecondChances(states)

    expect(states).toEqual(snapshot)
  })
})
