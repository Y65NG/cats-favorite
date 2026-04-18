import type {
    BehaviorProfile,
    CatPersonalityResult,
    MetricKey,
    MiniGameResult,
    ScoredSession,
} from "./types"
import type { GameId } from "./types"

const METRICS: MetricKey[] = ["reaction", "focus", "ambush", "tracking"]

const PERSONALITY_LIBRARY: Array<{
    typeId: CatPersonalityResult["typeId"]
    titleZh: string
    summaryZh: string
    metricWeights: Partial<Record<MetricKey, number>>
    favoriteGames: GameId[]
}> = [
    {
        typeId: "agile-hunter",
        titleZh: "反应派",
        summaryZh: "一有动静就会立刻扑上去，反应很快，出手也很干脆",
        metricWeights: {
            reaction: 0.48,
            tracking: 0.24,
            ambush: 0.16,
            focus: 0.12,
        },
        favoriteGames: ["laser"],
    },
    {
        typeId: "focus-scout",
        titleZh: "观察派",
        summaryZh: "会先盯一会儿，确认目标路线以后再出手，属于越看越准的小猫",
        metricWeights: {
            focus: 0.5,
            tracking: 0.24,
            reaction: 0.12,
            ambush: 0.14,
        },
        favoriteGames: ["fish"],
    },
    {
        typeId: "speed-chaser",
        titleZh: "追击派",
        summaryZh: "目标一动起来就停不下来，属于越玩越兴奋、越追越来劲的小猫",
        metricWeights: {
            tracking: 0.44,
            reaction: 0.28,
            focus: 0.08,
            ambush: 0.2,
        },
        favoriteGames: ["feather"],
    },
    {
        typeId: "ambush-king",
        titleZh: "埋伏派",
        summaryZh: "特别会盯边角位置，目标一冒头，基本都会马上拍过去",
        metricWeights: {
            ambush: 0.52,
            reaction: 0.22,
            focus: 0.14,
            tracking: 0.12,
        },
        favoriteGames: ["bug"],
    },
    {
        typeId: "happy-patter",
        titleZh: "连击派",
        summaryZh: "一旦进入节奏就停不下来，连续出爪这件事它是真的很有兴趣",
        metricWeights: {
            tracking: 0.34,
            reaction: 0.24,
            focus: 0.16,
            ambush: 0.26,
        },
        favoriteGames: ["laser", "feather"],
    },
    {
        typeId: "curious-ranger",
        titleZh: "巡视派",
        summaryZh:
            "会先把场上的目标都看一遍，再挑自己最感兴趣的那个认真追的小猫",
        metricWeights: {
            focus: 0.3,
            tracking: 0.24,
            reaction: 0.18,
            ambush: 0.28,
        },
        favoriteGames: ["fish"],
    },
]

function clamp(value: number): number {
    return Math.min(1, Math.max(0, value))
}

function getAverage(results: MiniGameResult[], key: MetricKey): number {
    if (results.length === 0) {
        return 0
    }

    const total = results.reduce(
        (sum, result) => sum + result.normalizedMetrics[key],
        0,
    )
    return clamp(total / results.length)
}

function getFavoriteGame(results: MiniGameResult[]) {
    return (
        [...results].sort((left, right) => {
            const leftScore =
                left.rawSignals.hits * 2 +
                left.rawSignals.streak * 1.5 +
                left.normalizedMetrics.tracking +
                left.normalizedMetrics.reaction
            const rightScore =
                right.rawSignals.hits * 2 +
                right.rawSignals.streak * 1.5 +
                right.normalizedMetrics.tracking +
                right.normalizedMetrics.reaction

            return rightScore - leftScore
        })[0]?.gameId ?? "laser"
    )
}

function scorePersona(
    profile: BehaviorProfile,
    entry: (typeof PERSONALITY_LIBRARY)[number],
) {
    const metricScore = METRICS.reduce((sum, metric) => {
        return sum + profile[metric] * (entry.metricWeights[metric] ?? 0)
    }, 0)
    const favoriteBonus = entry.favoriteGames.includes(profile.favoriteGame)
        ? 0.2
        : 0

    return metricScore + favoriteBonus
}

function resolvePersonality(profile: BehaviorProfile): CatPersonalityResult {
    const candidate = PERSONALITY_LIBRARY.toSorted(
        (left, right) =>
            scorePersona(profile, right) - scorePersona(profile, left),
    )[0]

    return {
        typeId: candidate.typeId,
        titleZh: candidate.titleZh,
        summaryZh: candidate.summaryZh,
        sharePayload: {
            title: `本轮结果：${candidate.titleZh}`,
            text: `${candidate.titleZh}｜${candidate.summaryZh}`,
        },
    }
}

export function scoreCatSession(results: MiniGameResult[]): ScoredSession {
    const profile: BehaviorProfile = {
        reaction: getAverage(results, "reaction"),
        focus: getAverage(results, "focus"),
        ambush: getAverage(results, "ambush"),
        tracking: getAverage(results, "tracking"),
        favoriteGame: getFavoriteGame(results),
    }

    return {
        profile,
        result: resolvePersonality(profile),
    }
}
