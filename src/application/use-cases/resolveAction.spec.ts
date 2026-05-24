import { describe, expect, it } from 'vitest'
import { resolveAction } from '@/application/use-cases/resolveAction'
import type { FlipThreeCard, FreezeCard, SecondChanceCard } from '@/domain/entities/Card'
import type { GameState } from '@/domain/entities/GameState'
import { createPlayerRoundState, type PlayerRoundState } from '@/domain/entities/PlayerRoundState'
import { createGame } from '@/domain/rules/game'
import { createCardId } from '@/domain/value-objects/CardId'
import { createPlayerId } from '@/domain/value-objects/PlayerId'
import type { PlayerStatus } from '@/domain/value-objects/PlayerStatus'

// ---------- helpers ----------

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

function inProgressGame(
  statuses: readonly PlayerStatus[],
  options: {
    activePlayerIndex?: number
    playerStateOverrides?: Partial<PlayerRoundState>[]
  } = {},
): GameState {
  const pseudos = statuses.map((_, i) => `P${i + 1}`)
  const base = createGame(pseudos, [])
  const playerStates: PlayerRoundState[] = statuses.map((status, i) => ({
    ...createPlayerRoundState(createPlayerId(`p${i + 1}`)),
    status,
    ...(options.playerStateOverrides?.[i] ?? {}),
  }))
  const players = base.players.map((p, i) => ({ ...p, id: playerStates[i]!.playerId }))
  return {
    ...base,
    players,
    phase: 'in-round',
    roundNumber: 1,
    round: {
      playerStates,
      activePlayerIndex: options.activePlayerIndex ?? 0,
    },
  }
}

// ---------- Freeze ----------

describe('resolveAction: Freeze', () => {
  it('freezes the chosen target and discards the card', () => {
    const card = makeFreeze()
    const game: GameState = {
      ...inProgressGame(['active', 'active']),
      pendingAction: { card, originIndex: 0 },
    }

    const next = resolveAction(game, 1)

    expect(next.round?.playerStates[1]?.status).toBe<PlayerStatus>('frozen')
    expect(next.discard).toContain(card)
    expect(next.pendingAction).toBeNull()
  })

  it('lets the origin freeze themselves and advances the active seat afterwards', () => {
    const card = makeFreeze()
    const game: GameState = {
      ...inProgressGame(['active', 'active']),
      pendingAction: { card, originIndex: 0 },
    }

    const next = resolveAction(game, 0)

    expect(next.round?.playerStates[0]?.status).toBe<PlayerStatus>('frozen')
    expect(next.round?.activePlayerIndex).toBe(1) // turn handed over
  })

  it('throws when no target is provided', () => {
    const game: GameState = {
      ...inProgressGame(['active', 'active']),
      pendingAction: { card: makeFreeze(), originIndex: 0 },
    }

    expect(() => resolveAction(game, null)).toThrow(/requires a target/)
  })

  it('throws when the chosen target is not active', () => {
    const game: GameState = {
      ...inProgressGame(['active', 'busted']),
      pendingAction: { card: makeFreeze(), originIndex: 0 },
    }

    expect(() => resolveAction(game, 1)).toThrow(/active/)
  })
})

// ---------- Flip Three ----------

describe('resolveAction: Flip Three', () => {
  it('sets up forcedDraws with the chosen target and 3 remaining', () => {
    const card = makeFlipThree()
    const game: GameState = {
      ...inProgressGame(['active', 'active']),
      pendingAction: { card, originIndex: 0 },
    }

    const next = resolveAction(game, 1)

    expect(next.forcedDraws).toEqual({ targetIndex: 1, remaining: 3 })
    expect(next.discard).toContain(card)
    expect(next.pendingAction).toBeNull()
  })

  it('throws when no target is provided', () => {
    const game: GameState = {
      ...inProgressGame(['active', 'active']),
      pendingAction: { card: makeFlipThree(), originIndex: 0 },
    }

    expect(() => resolveAction(game, null)).toThrow(/requires a target/)
  })
})

// ---------- Second Chance ----------

describe('resolveAction: Second Chance', () => {
  it('places the card on the chosen target', () => {
    const card = makeSC()
    const game: GameState = {
      ...inProgressGame(['active', 'active']),
      pendingAction: { card, originIndex: 0 },
    }

    const next = resolveAction(game, 1)

    expect(next.round?.playerStates[1]?.secondChance).toBe(card)
    expect(next.discard).toEqual([])
  })

  it('discards the card when targetIndex is null (no valid recipient)', () => {
    const card = makeSC()
    const game: GameState = {
      ...inProgressGame(['active', 'active'], {
        playerStateOverrides: [{ secondChance: makeSC(99) }, { secondChance: makeSC(98) }],
      }),
      pendingAction: { card, originIndex: 0 },
    }

    const next = resolveAction(game, null)

    expect(next.discard).toContain(card)
    expect(next.pendingAction).toBeNull()
  })

  it('throws if the chosen target already holds a Second Chance', () => {
    const game: GameState = {
      ...inProgressGame(['active', 'active'], {
        playerStateOverrides: [{}, { secondChance: makeSC(99) }],
      }),
      pendingAction: { card: makeSC(), originIndex: 0 },
    }

    expect(() => resolveAction(game, 1)).toThrow(/already holds/)
  })
})

// ---------- queue draining ----------

describe('resolveAction: queue draining', () => {
  it('promotes the first queued action into pendingAction after resolution', () => {
    const nextAction = makeFreeze(1)
    const game: GameState = {
      ...inProgressGame(['active', 'active']),
      pendingAction: { card: makeFreeze(0), originIndex: 0 },
      actionQueue: [nextAction],
    }

    const next = resolveAction(game, 1)

    expect(next.pendingAction).toEqual({ card: nextAction, originIndex: 0 })
    expect(next.actionQueue).toEqual([])
  })

  it('keeps the rest of the queue when more than one action is pending', () => {
    const a1 = makeFreeze(1)
    const a2 = makeFlipThree(1)
    const game: GameState = {
      ...inProgressGame(['active', 'active']),
      pendingAction: { card: makeFreeze(0), originIndex: 0 },
      actionQueue: [a1, a2],
    }

    const next = resolveAction(game, 1)

    expect(next.pendingAction?.card).toBe(a1)
    expect(next.actionQueue).toEqual([a2])
  })

  it('does not hand the turn over while another action is still pending', () => {
    // The origin freezes themselves, but a queued action remains -> we
    // must NOT advance activePlayerIndex yet.
    const game: GameState = {
      ...inProgressGame(['active', 'active']),
      pendingAction: { card: makeFreeze(), originIndex: 0 },
      actionQueue: [makeFreeze(1)],
    }

    const next = resolveAction(game, 0)

    expect(next.round?.playerStates[0]?.status).toBe<PlayerStatus>('frozen')
    expect(next.round?.activePlayerIndex).toBe(0) // unchanged: queue not drained
  })
})

// ---------- error cases ----------

describe('resolveAction: error cases', () => {
  it('throws when no pending action is set', () => {
    const game = inProgressGame(['active', 'active'])
    expect(() => resolveAction(game, 0)).toThrow(/no pending action/)
  })

  it('throws when not in a round', () => {
    const base = createGame(['Alice', 'Bob'], [])
    expect(() => resolveAction(base, 0)).toThrow(/not in a round/)
  })

  it('throws on an invalid target index', () => {
    const game: GameState = {
      ...inProgressGame(['active', 'active']),
      pendingAction: { card: makeFreeze(), originIndex: 0 },
    }
    expect(() => resolveAction(game, 5)).toThrow(/invalid target/)
  })
})
