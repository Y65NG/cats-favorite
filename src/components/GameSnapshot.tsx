import type { GameId } from '../game/types'

type GameSnapshotProps = {
  gameId: GameId
  animated?: boolean
}

export function GameSnapshot({ gameId, animated = false }: GameSnapshotProps) {
  return (
    <div className={`snapshot snapshot-${gameId} ${animated ? 'snapshot-animated' : ''}`} aria-hidden="true">
      {gameId === 'laser' && <span className="snapshot-dot snapshot-dot--laser" />}

      {gameId === 'fish' && (
        <>
          <span className="snapshot-fish-lane snapshot-fish-lane--one" />
          <span className="snapshot-fish-lane snapshot-fish-lane--two" />
          <span className="snapshot-fish-lane snapshot-fish-lane--three" />
          <span className="snapshot-fish-shape snapshot-fish--one" />
          <span className="snapshot-fish-shape snapshot-fish--two" />
          <span className="snapshot-fish-shape snapshot-fish--three" />
        </>
      )}

      {gameId === 'feather' && (
        <>
          <span className="snapshot-feather-shaft" />
          <span className="snapshot-feather-plume" />
        </>
      )}

      {gameId === 'bug' && (
        <>
          <span className="snapshot-burrow snapshot-burrow--one" />
          <span className="snapshot-burrow snapshot-burrow--two" />
          <span className="snapshot-burrow snapshot-burrow--three" />
          <span className="snapshot-bug-shape snapshot-bug--one" />
          <span className="snapshot-bug-shape snapshot-bug--two" />
        </>
      )}
    </div>
  )
}
