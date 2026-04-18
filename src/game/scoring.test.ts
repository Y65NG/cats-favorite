import { describe, expect, it } from 'vitest'
import { scoreCatSession } from './scoring'
import type { MiniGameResult } from './types'

const sampleResults: MiniGameResult[] = [
  {
    gameId: 'laser',
    rawSignals: {
      hits: 18,
      misses: 4,
      taps: 22,
      averageReactionMs: 540,
      focusTimeMs: 8200,
      edgeHits: 2,
      targetSwitches: 6,
      streak: 4,
    },
    normalizedMetrics: {
      reaction: 0.88,
      focus: 0.61,
      ambush: 0.58,
      tracking: 0.84,
    },
    completedAt: '2026-04-18T10:00:00.000Z',
  },
  {
    gameId: 'fish',
    rawSignals: {
      hits: 15,
      misses: 5,
      taps: 20,
      averageReactionMs: 710,
      focusTimeMs: 10400,
      edgeHits: 1,
      targetSwitches: 9,
      streak: 5,
    },
    normalizedMetrics: {
      reaction: 0.72,
      focus: 0.91,
      ambush: 0.45,
      tracking: 0.89,
    },
    completedAt: '2026-04-18T10:01:00.000Z',
  },
  {
    gameId: 'feather',
    rawSignals: {
      hits: 20,
      misses: 6,
      taps: 26,
      averageReactionMs: 480,
      focusTimeMs: 7600,
      edgeHits: 3,
      targetSwitches: 8,
      streak: 8,
    },
    normalizedMetrics: {
      reaction: 0.92,
      focus: 0.57,
      ambush: 0.64,
      tracking: 0.76,
    },
    completedAt: '2026-04-18T10:02:00.000Z',
  },
  {
    gameId: 'bug',
    rawSignals: {
      hits: 17,
      misses: 3,
      taps: 20,
      averageReactionMs: 520,
      focusTimeMs: 6900,
      edgeHits: 10,
      targetSwitches: 12,
      streak: 6,
    },
    normalizedMetrics: {
      reaction: 0.86,
      focus: 0.55,
      ambush: 0.96,
      tracking: 0.68,
    },
    completedAt: '2026-04-18T10:03:00.000Z',
  },
]

describe('scoreCatSession', () => {
  it('aggregates behavior dimensions and chooses a matching personality card', () => {
    const session = scoreCatSession(sampleResults)

    expect(session.profile.reaction).toBeGreaterThan(0.8)
    expect(session.profile.ambush).toBeGreaterThan(0.65)
    expect(session.profile.favoriteGame).toBe('feather')
    expect(session.result.titleZh).toBe('追击派')
    expect(session.result.summaryZh).toContain('越玩越兴奋')
  })

  it('always returns bounded normalized profile values', () => {
    const session = scoreCatSession(sampleResults)

    for (const value of Object.values(session.profile)) {
      if (typeof value === 'number') {
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(1)
      }
    }
  })

  it('leans toward the cat favorite game when two profiles are otherwise close', () => {
    const bugFanResults: MiniGameResult[] = sampleResults.map((result) =>
      result.gameId === 'bug'
        ? {
            ...result,
            rawSignals: {
              ...result.rawSignals,
              hits: 28,
              streak: 10,
            },
            normalizedMetrics: {
              reaction: 0.83,
              focus: 0.58,
              ambush: 0.9,
              tracking: 0.67,
            },
          }
        : result.gameId === 'fish'
          ? {
              ...result,
              normalizedMetrics: {
                reaction: 0.72,
                focus: 0.89,
                ambush: 0.47,
                tracking: 0.75,
              },
            }
          : result,
    )

    const session = scoreCatSession(bugFanResults)

    expect(session.profile.favoriteGame).toBe('bug')
    expect(session.result.titleZh).toBe('埋伏派')
    expect(session.result.summaryZh).toContain('冒头')
  })
})
