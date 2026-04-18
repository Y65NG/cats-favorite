import { scoreCatSession } from './scoring'
import type { SessionAction, SessionState } from './types'

const REQUIRED_GAME_COUNT = 4

export function createInitialSessionState(): SessionState {
  return {
    view: 'grid',
    activeGameId: null,
    results: {},
    finalResult: null,
  }
}

export function sessionReducer(
  state: SessionState,
  action: SessionAction,
): SessionState {
  switch (action.type) {
    case 'start_game':
      return {
        ...state,
        view: 'game',
        activeGameId: action.gameId,
      }

    case 'complete_game': {
      const nextResults = {
        ...state.results,
        [action.result.gameId]: action.result,
      }
      const completedResults = Object.values(nextResults)

      if (completedResults.length === REQUIRED_GAME_COUNT) {
        return {
          view: 'result',
          activeGameId: null,
          results: nextResults,
          finalResult: scoreCatSession(completedResults),
        }
      }

      return {
        view: 'grid',
        activeGameId: null,
        results: nextResults,
        finalResult: null,
      }
    }

    case 'reset_session':
      return createInitialSessionState()
  }
}
