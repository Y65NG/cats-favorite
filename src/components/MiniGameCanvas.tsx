import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import type { CatalogGame } from "../game/catalog"
import {
  buildGameResult,
  createEngineState,
  drawGameFrame,
  getRoundConfig,
  getTargetHitRadius,
  updateGameState,
} from "../game/runtime"
import { gameAudio } from "../game/audio"
import type { MiniGameResult } from "../game/types"

type MiniGameCanvasProps = {
  definition: CatalogGame
  onComplete: (result: MiniGameResult) => void
}

export function MiniGameCanvas({
  definition,
  onComplete,
}: MiniGameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const lastFrameRef = useRef<number | null>(null)
  const engineRef = useRef(createEngineState(definition.id))
  const roundConfig = getRoundConfig(definition.id)
  const [soundEnabled, setSoundEnabled] = useState(() => gameAudio.isEnabled())
  const [hud, setHud] = useState({
    hits: 0,
    misses: 0,
    streak: 0,
    hitGoal: roundConfig.hitGoal,
    timeLeftMs: roundConfig.durationMs,
  })

  const summaryPill = useMemo(() => {
    return `命中 ${hud.hits} · 漏拍 ${hud.misses} · 连击 ${hud.streak}`
  }, [hud.hits, hud.misses, hud.streak])

  const renderFrame = useCallback(() => {
    if (!canvasRef.current) {
      return
    }

    drawGameFrame(canvasRef.current, engineRef.current)
    setHud({
      hits: engineRef.current.hits,
      misses: engineRef.current.misses,
      streak: engineRef.current.maxStreak,
      hitGoal: engineRef.current.hitGoal,
      timeLeftMs: engineRef.current.timeLeftMs,
    })
  }, [])

  const advance = useCallback(
    (deltaMs: number) => {
      updateGameState(engineRef.current, definition, deltaMs)
      renderFrame()

      if (engineRef.current.completed && !engineRef.current.reported) {
        engineRef.current.reported = true
        gameAudio.playComplete(definition.id)
        const result: MiniGameResult = buildGameResult(
          engineRef.current,
          definition,
        )
        startTransition(() => {
          onComplete(result)
        })
      }
    },
    [definition, onComplete, renderFrame],
  )

  const syncWindowHelpers = useCallback(() => {
    window.render_game_to_text = () =>
      JSON.stringify({
        view: "game",
        gameId: definition.id,
        note: "origin is top-left, x grows right, y grows down",
        timerMs: Math.round(engineRef.current.timeLeftMs),
        hitGoal: engineRef.current.hitGoal,
        hits: engineRef.current.hits,
        misses: engineRef.current.misses,
        streak: engineRef.current.maxStreak,
        targets: engineRef.current.targets
          .filter((target) => target.visible)
          .map((target) => ({
            id: target.id,
            x: Math.round(target.x),
            y: Math.round(target.y),
            r: Math.round(target.radius),
            hitR: Math.round(getTargetHitRadius(definition.id, target.radius)),
          })),
      })

    window.advanceTime = (ms: number) => {
      advance(ms)
    }
  }, [advance, definition.id])

  useEffect(() => {
    gameAudio.setEnabled(soundEnabled)
  }, [soundEnabled])

  useEffect(() => {
    engineRef.current = createEngineState(definition.id)
    renderFrame()
    syncWindowHelpers()

    const loop = (timestamp: number) => {
      const lastFrame = lastFrameRef.current ?? timestamp
      lastFrameRef.current = timestamp
      advance(timestamp - lastFrame)
      rafRef.current = window.requestAnimationFrame(loop)
    }

    rafRef.current = window.requestAnimationFrame(loop)

    return () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current)
      }
      lastFrameRef.current = null
    }
  }, [advance, definition.id, renderFrame, syncWindowHelpers])

  function resolvePointerPosition(
    event: React.PointerEvent<HTMLCanvasElement>,
  ) {
    const rect = event.currentTarget.getBoundingClientRect()
    const x =
      ((event.clientX - rect.left) / rect.width) * engineRef.current.width
    const y =
      ((event.clientY - rect.top) / rect.height) * engineRef.current.height

    return { x, y }
  }

  return (
    <div className="play-surface">
      <div className="play-surface__hud">
        <span className="status-pill">{definition.metricKeysLabel}</span>
        <span>{summaryPill}</span>
        <span>
          进度 {hud.hits} / {hud.hitGoal}
        </span>
        <span>剩余时间：{Math.ceil(hud.timeLeftMs / 1000)}s</span>
      </div>

      <canvas
        className="play-canvas"
        height={640}
        onPointerDown={async (event) => {
          const point = resolvePointerPosition(event)
          const previousHits = engineRef.current.hits
          const previousMisses = engineRef.current.misses

          await gameAudio.resume()
          engineRef.current.pointerDown(point.x, point.y)

          if (engineRef.current.hits > previousHits) {
            gameAudio.playHit(definition.id, engineRef.current.streak)
          } else if (engineRef.current.misses > previousMisses) {
            gameAudio.playMiss(definition.id)
          }

          renderFrame()
          syncWindowHelpers()
          advance(0)
        }}
        ref={canvasRef}
        width={960}
      />

      <div className="play-surface__footer">
        <p>
          {roundConfig.finishHint} 按 <kbd>F</kbd> 可以全屏。
        </p>
        <div className="play-surface__actions">
          <button
            className="ghost-button"
            onClick={() => {
              setSoundEnabled((enabled) => {
                const nextEnabled = !enabled
                gameAudio.setEnabled(nextEnabled)
                return nextEnabled
              })
            }}
            type="button"
          >
            {soundEnabled ? "音效开" : "音效关"}
          </button>
          <button
            className="ghost-button"
            onClick={() => {
              if (!document.fullscreenElement) {
                void canvasRef.current?.requestFullscreen()
                return
              }

              void document.exitFullscreen()
            }}
            type="button"
          >
            切换全屏
          </button>
        </div>
      </div>
    </div>
  )
}
