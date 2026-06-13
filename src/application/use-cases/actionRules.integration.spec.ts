import { describe, expect, it } from 'vitest'
import { drawCard } from '@/application/use-cases/drawCard'
import { endRound } from '@/application/use-cases/endRound'
import { resolveAction } from '@/application/use-cases/resolveAction'
import type {
  Card,
  FlipThreeCard,
  FreezeCard,
  NumberCard,
  SecondChanceCard,
} from '@/domain/entities/Card'
import type { GameState } from '@/domain/entities/GameState'
import { createPlayerRoundState, type PlayerRoundState } from '@/domain/entities/PlayerRoundState'
import type { RandomProvider } from '@/domain/ports/RandomProvider'
import { createGame } from '@/domain/rules/game'
import { calculateRoundScore } from '@/domain/rules/score'
import { createCardId } from '@/domain/value-objects/CardId'
import type { NumberValue } from '@/domain/value-objects/NumberValue'
import { createPlayerId } from '@/domain/value-objects/PlayerId'
import type { PlayerStatus } from '@/domain/value-objects/PlayerStatus'

/**
 * Integration tests for the action-card rules, driven through the real
 * use-case pipeline (drawCard -> resolveAction -> endRound) with a fully
 * deterministic deck. Unlike the per-rule unit specs, these verify the
 * orchestration end to end and mirror the exact wording of the rule book:
 *
 *  - GEL / FREEZE: the target loses all points for the round and is out.
 *  - TROIS / FLIP THREE: 3 forced draws; an action revealed during the
 *    sequence counts toward the 3 and is resolved *after*; even a busted
 *    target chooses where revealed actions go; Flip 7 stops the sequence.
 *  - SECONDE CHANCE: kept by its drawer; protects from one duplicate;
 *    redirected when the holder draws a second one; discarded when there
 *    is no valid recipient; all are discarded at the end of a round.
 */

// ---------- card builders ----------

function makeNumber(value: NumberValue, index = 0): NumberCard {
  return { id: createCardId(`number-${value}-${index}`), kind: 'number', value }
}

function makeFreeze(index = 0): FreezeCard {
  return { id: createCardId(`action-freeze-${index}`), kind: 'action', action: 'freeze' }
}

function makeFlipThree(index = 0): FlipThreeCard {
  return { id: createCardId(`action-flip-three-${index}`), kind: 'action', action: 'flip-three' }
}

function makeSC(index = 0): SecondChanceCard {
  return {
    id: createCardId(`action-second-chance-${index}`),
    kind: 'action',
    action: 'second-chance',
  }
}

// The deck is consumed top-first, so these tests never need a shuffle.
class NoShuffle implements RandomProvider {
  nextInt(): number {
    return 0
  }
}

const deps = { random: new NoShuffle() }

function inProgressGame(
  statuses: readonly PlayerStatus[],
  deck: readonly Card[],
  options: {
    activePlayerIndex?: number
    playerStateOverrides?: Partial<PlayerRoundState>[]
  } = {},
): GameState {
  const pseudos = statuses.map((_, i) => `P${i + 1}`)
  const base = createGame(pseudos, deck)
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
    round: { playerStates, activePlayerIndex: options.activePlayerIndex ?? 0 },
  }
}

// ---------- GEL / FREEZE ----------

describe('rules: Freeze', () => {
  it('zeroes the round score of a target that had points, and ends them for the round', () => {
    // P2 has a strong row; P1 draws a Freeze and chills P2.
    const freeze = makeFreeze()
    const game = inProgressGame(['active', 'active'], [freeze], {
      playerStateOverrides: [{}, { numberCards: [makeNumber(10), makeNumber(9)] }],
    })

    const afterDraw = drawCard(deps, game)
    expect(afterDraw.pendingAction).toEqual({ card: freeze, originIndex: 0 })

    const afterFreeze = resolveAction(afterDraw, 1)
    expect(afterFreeze.round?.playerStates[1]?.status).toBe<PlayerStatus>('frozen')
    // The frozen player scores 0 for the round despite the 19 on the row.
    expect(calculateRoundScore(afterFreeze.round!.playerStates[1]!).total).toBe(0)
    expect(afterFreeze.discard).toContain(freeze)

    const ended = endRound(afterFreeze)
    expect(ended.players[1]?.totalScore).toBe(0)
  })
})

// ---------- TROIS / FLIP THREE ----------

describe('rules: Flip Three', () => {
  it('forces the target to accept exactly three number cards', () => {
    const flip = makeFlipThree()
    // P1 draws the Flip Three then targets P2; the next 3 cards are P2's.
    const game = inProgressGame(
      ['active', 'active'],
      [flip, makeNumber(3), makeNumber(5), makeNumber(8)],
    )

    let g = drawCard(deps, game) // P1 pulls the Flip Three
    g = resolveAction(g, 1) // target P2
    expect(g.forcedDraws).toEqual({ targetIndex: 1, remaining: 3 })

    g = drawCard(deps, g) // forced 1
    g = drawCard(deps, g) // forced 2
    g = drawCard(deps, g) // forced 3

    expect(g.forcedDraws).toBeNull()
    expect(g.round?.playerStates[1]?.numberCards).toHaveLength(3)
  })

  it('counts an action revealed during the sequence toward the 3 and resolves it AFTER', () => {
    // Forced target P2 is owed 3. The revealed order is: Freeze, number,
    // number. The Freeze counts as one of the three draws and is queued,
    // not resolved mid-flip; it becomes pending only once the 3rd card
    // has been flipped.
    const flip = makeFlipThree()
    const revealedFreeze = makeFreeze(1)
    const game = inProgressGame(
      ['active', 'active', 'active'],
      [flip, revealedFreeze, makeNumber(4), makeNumber(6)],
    )

    let g = drawCard(deps, game)
    g = resolveAction(g, 1) // P2 is the Flip Three target

    g = drawCard(deps, g) // reveals Freeze -> queued, remaining 3 -> 2
    expect(g.forcedDraws).toEqual({ targetIndex: 1, remaining: 2 })
    expect(g.pendingAction).toBeNull()
    expect(g.actionQueue).toEqual([{ card: revealedFreeze, originIndex: 1 }])

    g = drawCard(deps, g) // number, remaining 2 -> 1
    expect(g.pendingAction).toBeNull()

    g = drawCard(deps, g) // number, remaining 1 -> 0 -> sequence ends, drain queue
    expect(g.forcedDraws).toBeNull()
    expect(g.pendingAction).toEqual({ card: revealedFreeze, originIndex: 1 })
  })

  it('lets a busted target still choose who receives a revealed action', () => {
    // P2 (forced target) already holds a 5 and busts on the first forced
    // draw (another 5). A Freeze is then revealed: per the rules the
    // busted player still picks an active target for it.
    const flip = makeFlipThree()
    const revealedFreeze = makeFreeze(1)
    const game = inProgressGame(
      ['active', 'active', 'active'],
      [
        flip,
        makeNumber(5, 1), // busts P2
        revealedFreeze, // revealed while busted -> still queued by P2
        makeNumber(9),
      ],
      {
        playerStateOverrides: [{}, { numberCards: [makeNumber(5, 0)] }, {}],
      },
    )

    let g = drawCard(deps, game)
    g = resolveAction(g, 1)

    g = drawCard(deps, g) // bust P2, remaining 3 -> 2
    expect(g.round?.playerStates[1]?.status).toBe<PlayerStatus>('busted')

    g = drawCard(deps, g) // reveal Freeze on busted target -> queued by P2
    expect(g.actionQueue).toEqual([{ card: revealedFreeze, originIndex: 1 }])

    g = drawCard(deps, g) // last forced number -> sequence ends, drain Freeze
    expect(g.forcedDraws).toBeNull()
    // The busted target (index 1) owns the choice for the revealed Freeze.
    expect(g.pendingAction).toEqual({ card: revealedFreeze, originIndex: 1 })

    // P2 (busted) freezes P3.
    const afterFreeze = resolveAction(g, 2)
    expect(afterFreeze.round?.playerStates[2]?.status).toBe<PlayerStatus>('frozen')
  })

  it('stops the sequence immediately on Flip 7 even with draws still owed', () => {
    // P1 already has 6 unique numbers and is owed 3 forced draws. The
    // 7th unique completes Flip 7 and the sequence (and the round) stop.
    const six: NumberCard[] = [1, 2, 3, 4, 5, 6].map((v) => makeNumber(v as NumberValue))
    const game: GameState = {
      ...inProgressGame(['active', 'active'], [makeNumber(7)], {
        playerStateOverrides: [{ numberCards: six }],
      }),
      forcedDraws: { targetIndex: 0, remaining: 3 },
    }

    const g = drawCard(deps, game)

    expect(g.round?.playerStates[0]?.status).toBe<PlayerStatus>('flip7')
    expect(g.forcedDraws).toBeNull() // stopped early, 2 draws were owed
  })
})

// ---------- SECONDE CHANCE ----------

describe('rules: Second Chance', () => {
  it('is kept by the player who draws it', () => {
    const sc = makeSC()
    const game = inProgressGame(['active', 'active'], [sc])

    const afterDraw = drawCard(deps, game) // P1 draws the SC
    expect(afterDraw.pendingAction).toEqual({ card: sc, originIndex: 0 })

    // Only valid target is the drawer themselves (empty slot).
    const afterPlace = resolveAction(afterDraw, 0)
    expect(afterPlace.round?.playerStates[0]?.secondChance).toBe(sc)
  })

  it('protects from one duplicate then is discarded with the duplicate', () => {
    const sc = makeSC()
    const dup = makeNumber(5, 1)
    const game = inProgressGame(['active', 'active'], [dup], {
      playerStateOverrides: [{ numberCards: [makeNumber(5, 0)], secondChance: sc }],
    })

    const next = drawCard(deps, game)

    expect(next.round?.playerStates[0]?.status).toBe<PlayerStatus>('active')
    expect(next.round?.playerStates[0]?.secondChance).toBeNull()
    expect(next.discard).toEqual([dup, sc])
  })

  it('is redirected to another active player when the holder draws a second one', () => {
    const held = makeSC(0)
    const drawn = makeSC(1)
    // P1 already holds an SC and draws another; it must go to an active
    // player whose slot is empty (P2 or P3), never back to P1.
    const game = inProgressGame(['active', 'active', 'active'], [drawn], {
      playerStateOverrides: [{ secondChance: held }, {}, {}],
    })

    const afterDraw = drawCard(deps, game)
    expect(afterDraw.pendingAction).toEqual({ card: drawn, originIndex: 0 })

    const afterPlace = resolveAction(afterDraw, 2) // hand it to P3
    expect(afterPlace.round?.playerStates[0]?.secondChance).toBe(held) // unchanged
    expect(afterPlace.round?.playerStates[2]?.secondChance).toBe(drawn)
  })

  it('is discarded when every active player already holds one', () => {
    const drawn = makeSC(3)
    const game = inProgressGame(['active', 'active'], [drawn], {
      playerStateOverrides: [{ secondChance: makeSC(0) }, { secondChance: makeSC(1) }],
    })

    const afterDraw = drawCard(deps, game) // P1 draws a 3rd SC, nowhere to go
    const afterDiscard = resolveAction(afterDraw, null)

    expect(afterDiscard.discard).toContain(drawn)
    expect(afterDiscard.pendingAction).toBeNull()
  })

  it('discards every Second Chance still held at the end of the round', () => {
    const sc1 = makeSC(0)
    const sc2 = makeSC(1)
    const game = inProgressGame(['stayed', 'stayed'], [], {
      playerStateOverrides: [
        { numberCards: [makeNumber(4)], secondChance: sc1 },
        { secondChance: sc2 },
      ],
    })

    const ended = endRound(game)

    expect(ended.discard).toContain(sc1)
    expect(ended.discard).toContain(sc2)
    expect(ended.round).toBeNull()
  })
})
