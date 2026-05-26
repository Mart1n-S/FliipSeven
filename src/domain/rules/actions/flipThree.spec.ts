import { describe, expect, it } from 'vitest'
import type { FlipThreeCard } from '@/domain/entities/Card'
import { createPlayerRoundState, type PlayerRoundState } from '@/domain/entities/PlayerRoundState'
import { applyFlipThree } from '@/domain/rules/actions/flipThree'
import { createCardId } from '@/domain/value-objects/CardId'
import { createPlayerId } from '@/domain/value-objects/PlayerId'
import type { PlayerStatus } from '@/domain/value-objects/PlayerStatus'

function makeFlipThree(index = 0): FlipThreeCard {
  return {
    id: createCardId(`action-flip-three-${index}`),
    kind: 'action',
    action: 'flip-three',
  }
}

function activeState(): PlayerRoundState {
  return createPlayerRoundState(createPlayerId('p1'))
}

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
