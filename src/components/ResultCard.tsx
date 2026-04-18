import { forwardRef } from 'react'
import { GAME_MAP, getTraitLabel } from '../game/catalog'
import type { MiniGameResult, ScoredSession } from '../game/types'

type ResultCardProps = {
  scoredSession: ScoredSession
  results: Partial<Record<MiniGameResult['gameId'], MiniGameResult>>
  favoriteGameLabel: string
}

const DIMENSION_LABELS = [
  { key: 'reaction', label: '反应力' },
  { key: 'focus', label: '专注力' },
  { key: 'ambush', label: '突袭欲' },
  { key: 'tracking', label: '追踪欲' },
] as const

export const ResultCard = forwardRef<HTMLDivElement, ResultCardProps>(function ResultCard(
  { favoriteGameLabel, results, scoredSession },
  ref,
) {
  return (
    <div className="result-card" ref={ref}>
      <section className="result-card__hero">
        <div>
          <p className="eyebrow">它这轮更像</p>
          <h2>{scoredSession.result.titleZh}</h2>
          <p className="result-copy">{scoredSession.result.summaryZh}</p>
        </div>

        <div className="result-card__illustration" aria-hidden="true">
          <div className="cat-face">
            <span className="cat-ear cat-ear-left" />
            <span className="cat-ear cat-ear-right" />
            <span className="cat-eye cat-eye-left" />
            <span className="cat-eye cat-eye-right" />
            <span className="cat-nose" />
          </div>
        </div>
      </section>

      <section className="result-card__bars">
        {DIMENSION_LABELS.map((dimension) => (
          <div className="trait-bar" key={dimension.key}>
            <div className="trait-bar__label">
              <span>{dimension.label}</span>
              <strong>{Math.round(scoredSession.profile[dimension.key] * 100)}</strong>
            </div>
            <div className="trait-bar__track">
              <span
                className="trait-bar__fill"
                style={{ width: `${Math.round(scoredSession.profile[dimension.key] * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </section>

      <section className="result-card__summary-grid">
        <article>
          <p className="eyebrow">最爱玩的</p>
          <h3>{favoriteGameLabel}</h3>
          <p>
            {favoriteGameLabel
              ? `${favoriteGameLabel} 一出来，它基本就会立刻盯上。`
              : '再来一轮，看看它最容易盯上哪种目标。'}
          </p>
        </article>

        <article>
          <p className="eyebrow">这轮表现</p>
          <ul className="result-list">
            {Object.values(results).map((result) => (
              <li key={result.gameId}>
                <span>{GAME_MAP[result.gameId].name}</span>
                <strong>{getTraitLabel(result)}</strong>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  )
})
