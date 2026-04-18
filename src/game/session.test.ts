import { describe, expect, it } from 'vitest'
import { createInitialSessionState, sessionReducer } from './session'
import type { MiniGameResult } from './types'

function createResult(gameId: MiniGameResult['gameId']): MiniGameResult {
  return {
    gameId,
    rawSignals: {
      hits: 10,
      misses: 2,
      taps: 12,
      averageReactionMs: 600,
      focusTimeMs: 8000,
      edgeHits: gameId === 'bug' ? 8 : 2,
      targetSwitches: 4,
      streak: 3,
    },
    normalizedMetrics: {
      reaction: gameId === 'laser' ? 0.9 : 0.7,
      focus: gameId === 'fish' ? 0.92 : 0.58,
      ambush: gameId === 'bug' ? 0.97 : 0.45,
      tracking: gameId === 'feather' ? 0.88 : 0.62,
    },
    completedAt: '2026-04-18T10:00:00.000Z',
  }
}

describe('sessionReducer', () => {
  it('starts a game from the toybox grid', () => {
    const state = sessionReducer(createInitialSessionState(), {
      type: 'start_game',
      gameId: 'laser',
    })

    expect(state.view).toBe('game')
    expect(state.activeGameId).toBe('laser')
  })

  it('moves to the result screen after all four games complete', () => {
    let state = createInitialSessionState()

    for (const gameId of ['laser', 'fish', 'feather', 'bug'] as const) {
      state = sessionReducer(state, {
        type: 'complete_game',
        result: createResult(gameId),
      })
    }

    expect(state.view).toBe('result')
    expect(state.results.bug?.gameId).toBe('bug')
    expect(state.finalResult?.result.titleZh).toBeTruthy()
  })

  it('resets back to a fresh toybox session', () => {
    const completed = sessionReducer(createInitialSessionState(), {
      type: 'complete_game',
      result: createResult('laser'),
    })

    const reset = sessionReducer(completed, { type: 'reset_session' })

    expect(reset.view).toBe('grid')
    expect(reset.activeGameId).toBeNull()
    expect(Object.keys(reset.results)).toHaveLength(0)
    expect(reset.finalResult).toBeNull()
  })
})
