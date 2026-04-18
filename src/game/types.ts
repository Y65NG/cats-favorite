export type GameId = 'laser' | 'fish' | 'feather' | 'bug'

export type ViewMode = 'grid' | 'game' | 'result'

export type MetricKey = 'reaction' | 'focus' | 'ambush' | 'tracking'

export type RawSignals = {
  hits: number
  misses: number
  taps: number
  averageReactionMs: number
  focusTimeMs: number
  edgeHits: number
  targetSwitches: number
  streak: number
}

export type NormalizedMetrics = Record<MetricKey, number>

export type MiniGameDefinition = {
  id: GameId
  name: string
  snapshotStyle: string
  metricKeys: MetricKey[]
  statusTag: string
}

export type MiniGameResult = {
  gameId: GameId
  rawSignals: RawSignals
  normalizedMetrics: NormalizedMetrics
  completedAt: string
}

export type BehaviorProfile = NormalizedMetrics & {
  favoriteGame: GameId
}

export type CatPersonalityTypeId =
  | 'agile-hunter'
  | 'focus-scout'
  | 'speed-chaser'
  | 'ambush-king'
  | 'happy-patter'
  | 'curious-ranger'

export type CatPersonalityResult = {
  typeId: CatPersonalityTypeId
  titleZh: string
  summaryZh: string
  sharePayload: {
    title: string
    text: string
  }
}

export type ScoredSession = {
  profile: BehaviorProfile
  result: CatPersonalityResult
}

export type SessionState = {
  view: ViewMode
  activeGameId: GameId | null
  results: Partial<Record<GameId, MiniGameResult>>
  finalResult: ScoredSession | null
}

export type SessionAction =
  | { type: 'start_game'; gameId: GameId }
  | { type: 'complete_game'; result: MiniGameResult }
  | { type: 'reset_session' }
