import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react"
import html2canvas from "html2canvas"
import "./App.css"
import { MiniGameCanvas } from "./components/MiniGameCanvas"
import { ResultCard } from "./components/ResultCard"
import { GameSnapshot } from "./components/GameSnapshot"
import { gameAudio } from "./game/audio"
import {
  GAME_DEFINITIONS,
  GAME_MAP,
  getCompletedSummary,
  getTraitLabel,
} from "./game/catalog"
import { createInitialSessionState, sessionReducer } from "./game/session"
import type { GameId, MiniGameResult } from "./game/types"

function App() {
  const [session, dispatch] = useReducer(
    sessionReducer,
    undefined,
    createInitialSessionState,
  )
  const [shareState, setShareState] = useState<"idle" | "sharing">("idle")
  const [shareMessage, setShareMessage] = useState("")
  const resultCardRef = useRef<HTMLDivElement>(null)

  const deferredFinalResult = useDeferredValue(session.finalResult)
  const completedCount = Object.keys(session.results).length
  const activeGame = session.activeGameId
    ? GAME_MAP[session.activeGameId]
    : null

  const favoriteGameLabel = useMemo(() => {
    if (!deferredFinalResult) {
      return ""
    }

    return GAME_MAP[deferredFinalResult.profile.favoriteGame].name
  }, [deferredFinalResult])

  useEffect(() => {
    if (session.view === "game") {
      return
    }

    window.advanceTime = () => undefined
    window.render_game_to_text = () =>
      JSON.stringify({
        view: session.view,
        completedCount,
        activeGameId: session.activeGameId,
        availableGames: GAME_DEFINITIONS.map((game) => ({
          id: game.id,
          name: game.name,
          completed: Boolean(session.results[game.id]),
          status: session.results[game.id]
            ? getCompletedSummary(session.results[game.id]!)
            : game.statusTag,
        })),
        result: deferredFinalResult
          ? {
              title: deferredFinalResult.result.titleZh,
              summary: deferredFinalResult.result.summaryZh,
              favoriteGame: favoriteGameLabel,
            }
          : null,
      })
  }, [
    completedCount,
    deferredFinalResult,
    favoriteGameLabel,
    session.activeGameId,
    session.results,
    session.view,
  ])

  function handleStartGame(gameId: GameId) {
    setShareMessage("")
    void gameAudio.resume().then(() => {
      gameAudio.playStart(gameId)
    })
    dispatch({ type: "start_game", gameId })
  }

  function handleCompleteGame(result: MiniGameResult) {
    startTransition(() => {
      dispatch({ type: "complete_game", result })
    })
  }

  function handleReplay() {
    setShareMessage("")
    dispatch({ type: "reset_session" })
  }

  async function handleShareCard() {
    if (!resultCardRef.current || !deferredFinalResult) {
      return
    }

    setShareState("sharing")
    setShareMessage("")

    try {
      const canvas = await html2canvas(resultCardRef.current, {
        backgroundColor: "#fffdf5",
        scale: 2,
      })

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/png")
      })

      if (!blob) {
        throw new Error("结果卡片生成失败")
      }

      const file = new File([blob], "cats-favorite-card.png", {
        type: "image/png",
      })
      const sharePayload = deferredFinalResult.result.sharePayload

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: sharePayload.title,
          text: sharePayload.text,
          files: [file],
        })
        setShareMessage("结果卡片已经准备好分享。")
      } else {
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = "cats-favorite-card.png"
        link.click()
        URL.revokeObjectURL(url)
        setShareMessage("结果卡片已经保存到本地。")
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setShareMessage("分享已取消")
      } else {
        setShareMessage("保存失败了，稍后再试一次")
      }
    } finally {
      setShareState("idle")
    }
  }

  return (
    <main className="app-shell">
      <div className="ambient ambient-left" aria-hidden="true" />
      <div className="ambient ambient-right" aria-hidden="true" />

      {session.view === "grid" && (
        <section className="toybox-screen">
          <header className="hero-banner">
            <div className="hero-copy">
              <p className="eyebrow">猫咪游戏盒</p>
              <h1>猫咪能力测试</h1>
              <p className="hero-summary">看小猫想先玩哪个</p>
            </div>

            <div className="hero-status">
              <span className="status-pill">已完成 {completedCount} / 4</span>
              <p>四轮测试结束之后就能看到猫咪是什么类型</p>
            </div>
          </header>

          <section className="toybox-grid" aria-label="猫咪小游戏宫格">
            {GAME_DEFINITIONS.map((game) => {
              const result = session.results[game.id]
              return (
                <article className="game-tile" key={game.id}>
                  <div className="game-tile__topline">
                    <span className={`tag tag-${game.id}`}>
                      {result ? getTraitLabel(result) : game.statusTag}
                    </span>
                    <span className="game-status">
                      {result ? "已完成" : "待测试"}
                    </span>
                  </div>

                  <GameSnapshot gameId={game.id} animated={Boolean(result)} />

                  <div className="game-tile__body">
                    <div>
                      <h2>{game.name}</h2>
                      <p>{game.description}</p>
                    </div>

                    <div className="game-tile__footer">
                      <p className="metric-note">
                        {result
                          ? getCompletedSummary(result)
                          : `目标：${game.metricKeysLabel}`}
                      </p>
                      <button
                        aria-label={`${game.name} 开始游戏`}
                        className="primary-button"
                        onClick={() => handleStartGame(game.id)}
                        type="button"
                      >
                        {result ? "再来一局" : "开始游戏"}
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </section>

          <section className="grid-footer">
            <div>
              <p className="eyebrow">行为画像维度</p>
              <div className="legend-row">
                <span>反应力</span>
                <span>专注力</span>
                <span>突袭欲</span>
                <span>追踪欲</span>
              </div>
            </div>
          </section>
        </section>
      )}

      {session.view === "game" && activeGame && (
        <section className="game-screen">
          <header className="game-screen__header">
            <div>
              <p className="eyebrow">游戏中</p>
              <h1>{activeGame.name}</h1>
              <p className="hero-summary">{activeGame.instructions}</p>
            </div>
            <button
              className="ghost-button"
              onClick={() => dispatch({ type: "reset_session" })}
              type="button"
            >
              返回首页
            </button>
          </header>

          <MiniGameCanvas
            definition={activeGame}
            onComplete={handleCompleteGame}
          />
        </section>
      )}

      {session.view === "result" && deferredFinalResult && (
        <section className="result-screen">
          <header className="result-header">
            <div>
              <p className="eyebrow">本轮结果</p>
              <h1>{deferredFinalResult.result.titleZh}</h1>
              <p className="hero-summary">
                {deferredFinalResult.result.summaryZh}
              </p>
            </div>
            <div className="result-header__actions">
              <button
                className="ghost-button"
                onClick={handleReplay}
                type="button"
              >
                再来一轮
              </button>
              <button
                className="primary-button"
                disabled={shareState === "sharing"}
                onClick={() => {
                  void handleShareCard()
                }}
                type="button"
              >
                {shareState === "sharing" ? "结果生成中…" : "保存结果卡"}
              </button>
            </div>
          </header>

          <ResultCard
            favoriteGameLabel={favoriteGameLabel}
            ref={resultCardRef}
            results={session.results}
            scoredSession={deferredFinalResult}
          />

          {shareMessage && <p className="share-message">{shareMessage}</p>}
        </section>
      )}
    </main>
  )
}

export default App
