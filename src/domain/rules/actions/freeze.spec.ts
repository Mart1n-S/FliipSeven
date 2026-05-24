import { describe, expect, it } from 'vitest'
import type { FreezeCard } from '@/domain/entities/Card'
import { createPlayerRoundState, type PlayerRoundState } from '@/domain/entities/PlayerRoundState'
import { applyFreeze } from '@/domain/rules/actions/freeze'
import { createCardId } from '@/domain/value-objects/CardId'
import { createPlayerId } from '@/domain/value-objects/PlayerId'
import type { PlayerStatus } from '@/domain/value-objects/PlayerStatus'

function makeFreeze(index = 0): FreezeCard {
  return {
    id: createCardId(`action-freeze-${index}`),
    kind: 'action',
    action: 'freeze',
  }
}

function activeState(): PlayerRoundState {
  return createPlayerRoundState(createPlayerId('p1'))
}

describe('applyFreeze', () => {
  it('marks the target as frozen and discards the freeze card', () => {
    const card = makeFreeze()
    const result = applyFreeze(activeState(), card)

    expect(result.state.status).toBe<PlayerStatus>('frozen')
    expect(result.discarded).toEqual([card])
  })

  it('keeps the target cards on the row (they are discarded at end of round)', () => {
    const state: PlayerRoundState = {
      ...activeState(),
      numberCards: [
        {
          id: createCardId('number-5-0'),
          kind: 'number',
          value: 5,
        },
      ],
    }

    const result = applyFreeze(state, makeFreeze())

    expect(result.state.numberCards).toEqual(state.numberCards)
  })

  it.each<PlayerStatus>(['stayed', 'busted', 'frozen', 'flip7'])(
    'throws when the target status is %s',
    (status) => {
      const state: PlayerRoundState = { ...activeState(), status }

      expect(() => applyFreeze(state, makeFreeze())).toThrow(/active/)
    },
  )

  it('does not mutate the input state', () => {
    const state = activeState()
    const snapshot = structuredClone(state)

    applyFreeze(state, makeFreeze())

    expect(state).toEqual(snapshot)
  })
})
