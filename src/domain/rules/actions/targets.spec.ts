import { describe, expect, it } from 'vitest'
import type { FlipThreeCard, FreezeCard, SecondChanceCard } from '@/domain/entities/Card'
import { createPlayerRoundState, type PlayerRoundState } from '@/domain/entities/PlayerRoundState'
import { getValidActionTargets } from '@/domain/rules/actions/targets'
import { createCardId } from '@/domain/value-objects/CardId'
import { createPlayerId } from '@/domain/value-objects/PlayerId'
import type { PlayerStatus } from '@/domain/value-objects/PlayerStatus'

const freeze: FreezeCard = {
  id: createCardId('action-freeze-0'),
  kind: 'action',
  action: 'freeze',
}
const flipThree: FlipThreeCard = {
  id: createCardId('action-flip-three-0'),
  kind: 'action',
  action: 'flip-three',
}
const sc: SecondChanceCard = {
  id: createCardId('action-second-chance-0'),
  kind: 'action',
  action: 'second-chance',
}

function states(
  statuses: readonly PlayerStatus[],
  overrides: Partial<PlayerRoundState>[] = [],
): PlayerRoundState[] {
  return statuses.map((status, i) => ({
    ...createPlayerRoundState(createPlayerId(`p${i + 1}`)),
    status,
    ...(overrides[i] ?? {}),
  }))
}

describe('getValidActionTargets: Freeze and Flip Three', () => {
  it.each([
    ['Freeze', freeze],
    ['Flip Three', flipThree],
  ])('%s targets every active player (origin included)', (_label, card) => {
    const result = getValidActionTargets(card, states(['active', 'busted', 'active']), 0)
    expect(result).toEqual([0, 2])
  })

  it.each([
    ['Freeze', freeze],
    ['Flip Three', flipThree],
  ])('%s returns origin alone when nobody else is active', (_label, card) => {
    expect(getValidActionTargets(card, states(['active', 'busted']), 0)).toEqual([0])
  })
})

describe('getValidActionTargets: Second Chance', () => {
  it('returns origin alone when their slot is empty', () => {
    const result = getValidActionTargets(sc, states(['active', 'active', 'active']), 1)
    expect(result).toEqual([1])
  })

  it('excludes the origin when their slot is already filled, and returns active others without SC', () => {
    const occupied: Partial<PlayerRoundState>[] = [{ secondChance: sc }, {}, {}]
    const result = getValidActionTargets(sc, states(['active', 'active', 'active'], occupied), 0)
    expect(result).toEqual([1, 2])
  })

  it('skips other players who already hold a Second Chance', () => {
    const occupied: Partial<PlayerRoundState>[] = [{ secondChance: sc }, { secondChance: sc }, {}]
    const result = getValidActionTargets(sc, states(['active', 'active', 'active'], occupied), 0)
    expect(result).toEqual([2])
  })

  it('returns [] when origin has SC and no other active is eligible (caller must discard)', () => {
    const occupied: Partial<PlayerRoundState>[] = [{ secondChance: sc }, { secondChance: sc }]
    expect(getValidActionTargets(sc, states(['active', 'active'], occupied), 0)).toEqual([])
  })

  it('returns [] when origin has SC and every other player is out of the round', () => {
    const occupied: Partial<PlayerRoundState>[] = [{ secondChance: sc }, {}, {}]
    expect(getValidActionTargets(sc, states(['active', 'busted', 'frozen'], occupied), 0)).toEqual(
      [],
    )
  })
})
