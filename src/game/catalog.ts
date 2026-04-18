import type { GameId, MiniGameDefinition, MiniGameResult } from "./types"

export type CatalogGame = MiniGameDefinition & {
    description: string
    instructions: string
    metricKeysLabel: string
}

export const GAME_DEFINITIONS: CatalogGame[] = [
    {
        id: "laser",
        name: "激光点点",
        snapshotStyle: "laser",
        metricKeys: ["reaction", "tracking"],
        statusTag: "反应",
        description: "红点会突然窜开，看它会不会立刻扑过去",
        instructions: "盯着乱窜的红点拍，碰到得越快，反应就越好",
        metricKeysLabel: "反应速度 · 扑击欲",
    },
    {
        id: "fish",
        name: "小鱼乱游",
        snapshotStyle: "fish",
        metricKeys: ["focus", "tracking"],
        statusTag: "追踪",
        description: "几条小鱼会在不同泳道之间来回换道，看它能不能一直跟住目标",
        instructions: "跟住会突然换道的小鱼群，别拍一下就分心",
        metricKeysLabel: "命中率 · 专注时长",
    },
    {
        id: "feather",
        name: "羽毛追追",
        snapshotStyle: "feather",
        metricKeys: ["reaction", "tracking"],
        statusTag: "兴奋",
        description: "羽毛会像逗猫棒一样左右大幅甩动，看它会不会越追越起劲",
        instructions: "顺着羽毛摆动的节奏连续拍，跟得越稳，连击越高",
        metricKeysLabel: "节奏追逐 · 连击意愿",
    },
    {
        id: "bug",
        name: "虫虫突袭",
        snapshotStyle: "bug",
        metricKeys: ["ambush", "reaction"],
        statusTag: "突袭",
        description: "虫虫会从边角洞口突然冒头，看它会不会专门盯边角位置",
        instructions: "盯住边角的小洞口，谁一冒头就立刻拍谁",
        metricKeysLabel: "洞口伏击 · 突袭速度",
    },
]

export const GAME_MAP = Object.fromEntries(
    GAME_DEFINITIONS.map((game) => [game.id, game]),
) as Record<GameId, CatalogGame>

const TRAIT_LABELS = [
    { key: "reaction", label: "爪子很快" },
    { key: "focus", label: "盯得很稳" },
    { key: "ambush", label: "很会埋伏" },
    { key: "tracking", label: "追得很紧" },
] as const

export function getTraitLabel(result: MiniGameResult): string {
    const [best] = TRAIT_LABELS.toSorted(
        (left, right) =>
            result.normalizedMetrics[right.key] -
            result.normalizedMetrics[left.key],
    )

    return best.label
}

export function getCompletedSummary(result: MiniGameResult): string {
    if (result.gameId === "laser") {
        return `最佳反应 ${Math.round(result.rawSignals.averageReactionMs)}ms`
    }

    if (result.gameId === "fish") {
        return `命中率 ${Math.round(
            (result.rawSignals.hits / Math.max(result.rawSignals.taps, 1)) *
                100,
        )}%`
    }

    if (result.gameId === "feather") {
        return `最长连击 ${result.rawSignals.streak} 次`
    }

    return `边角命中 ${result.rawSignals.edgeHits} 次`
}
