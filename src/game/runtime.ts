import type {
    GameId,
    MiniGameDefinition,
    MiniGameResult,
    RawSignals,
} from "./types"

type Edge = "left" | "right" | "top" | "bottom" | "center"

type Target = {
    id: number
    x: number
    y: number
    vx: number
    vy: number
    radius: number
    bornAt: number
    wobble: number
    hue: string
    anchorX: number
    anchorY: number
    edge: Edge
    visible: boolean
    nextActiveAt: number
    activeUntil: number
    popDistance: number
    laneIndex: number
    laneTargetY: number
    laneSwitchAt: number
}

type HitEffectKind = "laser" | "fish" | "feather" | "bug"

type HitEffect = {
    id: number
    kind: HitEffectKind
    x: number
    y: number
    anchorX: number
    anchorY: number
    edge: Edge
    ageMs: number
    durationMs: number
    seed: number
}

export type EngineState = {
    gameId: GameId
    width: number
    height: number
    durationMs: number
    hitGoal: number
    elapsedMs: number
    timeLeftMs: number
    completed: boolean
    reported: boolean
    targets: Target[]
    hitEffects: HitEffect[]
    nextTargetId: number
    nextEffectId: number
    taps: number
    hits: number
    misses: number
    reactions: number[]
    edgeHits: number
    targetSwitches: number
    streak: number
    maxStreak: number
    focusTimeMs: number
    focusStartMs: number | null
    lastHitAt: number | null
    lastHitTargetId: number | null
    pointerDown: (x: number, y: number) => void
}

const GAME_PALETTES: Record<GameId, string[]> = {
    laser: ["#FF5A3C"],
    fish: ["#73DFFF", "#3EB4FF", "#8AE9FF"],
    feather: ["#FF8DB3", "#FFD5E6"],
    bug: ["#5FBE58", "#98D86A", "#468F44"],
}

const BUG_BURROWS = [
    { x: 78, y: 156, edge: "left" as const },
    { x: 78, y: 328, edge: "left" as const },
    { x: 246, y: 78, edge: "top" as const },
    { x: 486, y: 562, edge: "bottom" as const },
    { x: 722, y: 78, edge: "top" as const },
    { x: 882, y: 330, edge: "right" as const },
]

const FISH_LANES = [166, 314, 462]

type RoundConfig = {
    durationMs: number
    hitGoal: number
    finishHint: string
}

const ROUND_CONFIG: Record<GameId, RoundConfig> = {
    laser: {
        durationMs: 32000,
        hitGoal: 14,
        finishHint: "打到 14 次红点就会结束这局。",
    },
    fish: {
        durationMs: 42000,
        hitGoal: 10,
        finishHint: "跟住鱼群打到 10 次，这局就算完成。",
    },
    feather: {
        durationMs: 36000,
        hitGoal: 16,
        finishHint: "连续追到 16 次羽毛，这局就会结束。",
    },
    bug: {
        durationMs: 50000,
        hitGoal: 8,
        finishHint: "守到 8 次冒头虫虫，这局就算过关。",
    },
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value))
}

function randomBetween(min: number, max: number) {
    return Math.random() * (max - min) + min
}

function isTargetHit(state: EngineState, target: Target, x: number, y: number) {
    const dx = x - target.x
    const dy = y - target.y

    if (state.gameId === "fish") {
        const horizontalRadius = target.radius * 2.25
        const verticalRadius = target.radius * 1.35
        return (
            (dx * dx) / (horizontalRadius * horizontalRadius) +
                (dy * dy) / (verticalRadius * verticalRadius) <=
            1
        )
    }

    if (state.gameId === "feather") {
        const horizontalRadius = target.radius * 2.35
        const verticalRadius = target.radius * 1.7
        return (
            (dx * dx) / (horizontalRadius * horizontalRadius) +
                (dy * dy) / (verticalRadius * verticalRadius) <=
            1
        )
    }

    const radiusScale = state.gameId === "bug" ? 2 : 1.85
    return Math.hypot(dx, dy) <= target.radius * radiusScale
}

export function getTargetHitRadius(gameId: GameId, targetRadius: number) {
    if (gameId === "fish") {
        return targetRadius * 2.25
    }

    if (gameId === "feather") {
        return targetRadius * 2.35
    }

    if (gameId === "bug") {
        return targetRadius * 2
    }

    return targetRadius * 1.85
}

function createHitEffect(state: EngineState, target: Target): HitEffect {
    return {
        id: state.nextEffectId++,
        kind: state.gameId,
        x: target.x,
        y: target.y,
        anchorX: target.anchorX,
        anchorY: target.anchorY,
        edge: target.edge,
        ageMs: 0,
        durationMs:
            state.gameId === "laser"
                ? 240
                : state.gameId === "fish"
                  ? 380
                  : state.gameId === "feather"
                    ? 420
                    : 300,
        seed: randomBetween(0, Math.PI * 2),
    }
}

function createTarget(
    gameId: GameId,
    width: number,
    height: number,
    id: number,
): Target {
    const palette = GAME_PALETTES[gameId]

    if (gameId === "laser") {
        return {
            id,
            x: randomBetween(120, width - 120),
            y: randomBetween(120, height - 120),
            vx: randomBetween(-190, 190),
            vy: randomBetween(-175, 175),
            radius: 36,
            bornAt: 0,
            wobble: randomBetween(0, Math.PI * 2),
            hue: palette[0],
            anchorX: width / 2,
            anchorY: height / 2,
            edge: "center",
            visible: true,
            nextActiveAt: 0,
            activeUntil: Number.POSITIVE_INFINITY,
            popDistance: 0,
            laneIndex: 0,
            laneTargetY: height / 2,
            laneSwitchAt: Number.POSITIVE_INFINITY,
        }
    }

    if (gameId === "fish") {
        const laneIndex = (id - 1) % FISH_LANES.length
        const laneY = FISH_LANES[laneIndex]

        return {
            id,
            x: randomBetween(-40, width + 120),
            y: laneY,
            vx: randomBetween(128, 186),
            vy: 0,
            radius: 44,
            bornAt: 0,
            wobble: randomBetween(0, Math.PI * 2),
            hue: palette[(id - 1) % palette.length],
            anchorX: 0,
            anchorY: laneY,
            edge: "center",
            visible: true,
            nextActiveAt: 0,
            activeUntil: Number.POSITIVE_INFINITY,
            popDistance: 0,
            laneIndex,
            laneTargetY: laneY,
            laneSwitchAt: 520 + id * 150,
        }
    }

    if (gameId === "feather") {
        return {
            id,
            x: width / 2,
            y: height / 2,
            vx: 0,
            vy: 0,
            radius: 46,
            bornAt: 0,
            wobble: randomBetween(0, Math.PI * 2),
            hue: palette[0],
            anchorX: width / 2,
            anchorY: height / 2,
            edge: "center",
            visible: true,
            nextActiveAt: 0,
            activeUntil: Number.POSITIVE_INFINITY,
            popDistance: 0,
            laneIndex: 0,
            laneTargetY: height / 2,
            laneSwitchAt: Number.POSITIVE_INFINITY,
        }
    }

    const burrow = BUG_BURROWS[(id - 1) % BUG_BURROWS.length]
    const nextActiveAt = (id - 1) * 180

    return {
        id,
        x: burrow.x,
        y: burrow.y,
        vx: 0,
        vy: 0,
        radius: 30,
        bornAt: 0,
        wobble: randomBetween(0, Math.PI * 2),
        hue: palette[(id - 1) % palette.length],
        anchorX: burrow.x,
        anchorY: burrow.y,
        edge: burrow.edge,
        visible: false,
        nextActiveAt,
        activeUntil: nextActiveAt + 520 + ((id - 1) % 3) * 90,
        popDistance: 60 + ((id - 1) % 2) * 14,
        laneIndex: 0,
        laneTargetY: burrow.y,
        laneSwitchAt: Number.POSITIVE_INFINITY,
    }
}

function getTargetCount(gameId: GameId) {
    switch (gameId) {
        case "fish":
            return 3
        case "bug":
            return BUG_BURROWS.length
        default:
            return 1
    }
}

export function getRoundConfig(gameId: GameId) {
    return ROUND_CONFIG[gameId]
}

function finishRound(state: EngineState) {
    if (state.focusStartMs !== null && state.lastHitAt !== null) {
        state.focusTimeMs += state.lastHitAt - state.focusStartMs
    }
    state.focusStartMs = null
    state.completed = true
}

function rescheduleBugTarget(target: Target, elapsedMs: number) {
    target.visible = false
    target.nextActiveAt = elapsedMs + 320 + ((target.id * 71) % 380)
    target.activeUntil = target.nextActiveAt + 460 + (target.id % 3) * 80
    target.x = target.anchorX
    target.y = target.anchorY
}

export function createEngineState(gameId: GameId): EngineState {
    const width = 960
    const height = 640
    const { durationMs, hitGoal } = getRoundConfig(gameId)
    const targets = Array.from({ length: getTargetCount(gameId) }, (_, index) =>
        createTarget(gameId, width, height, index + 1),
    )

    const state: EngineState = {
        gameId,
        width,
        height,
        durationMs,
        hitGoal,
        elapsedMs: 0,
        timeLeftMs: durationMs,
        completed: false,
        reported: false,
        targets,
        hitEffects: [],
        nextTargetId: targets.length + 1,
        nextEffectId: 1,
        taps: 0,
        hits: 0,
        misses: 0,
        reactions: [],
        edgeHits: 0,
        targetSwitches: 0,
        streak: 0,
        maxStreak: 0,
        focusTimeMs: 0,
        focusStartMs: null,
        lastHitAt: null,
        lastHitTargetId: null,
        pointerDown: (x, y) => {
            state.taps += 1
            const hitTarget = state.targets.find((target) => {
                if (!target.visible) {
                    return false
                }

                return isTargetHit(state, target, x, y)
            })

            if (!hitTarget) {
                state.misses += 1
                state.streak = 0
                if (state.focusStartMs !== null && state.lastHitAt !== null) {
                    state.focusTimeMs += state.lastHitAt - state.focusStartMs
                }
                state.focusStartMs = null
                return
            }

            state.hits += 1
            state.hitEffects.push(createHitEffect(state, hitTarget))
            state.reactions.push(
                Math.max(120, state.elapsedMs - hitTarget.bornAt),
            )

            if (
                hitTarget.x < state.width * 0.18 ||
                hitTarget.x > state.width * 0.82 ||
                hitTarget.y < state.height * 0.18 ||
                hitTarget.y > state.height * 0.82
            ) {
                state.edgeHits += 1
            }

            if (
                state.lastHitTargetId !== null &&
                state.lastHitTargetId !== hitTarget.id
            ) {
                state.targetSwitches += 1
            }

            if (
                state.lastHitAt !== null &&
                state.focusStartMs !== null &&
                state.elapsedMs - state.lastHitAt > 1100
            ) {
                state.focusTimeMs += state.lastHitAt - state.focusStartMs
                state.focusStartMs = state.elapsedMs
            }

            if (state.focusStartMs === null) {
                state.focusStartMs = state.elapsedMs
            }

            state.lastHitAt = state.elapsedMs
            state.lastHitTargetId = hitTarget.id
            state.streak += 1
            state.maxStreak = Math.max(state.maxStreak, state.streak)

            if (state.hits >= state.hitGoal) {
                finishRound(state)
            }

            if (state.gameId === "bug") {
                rescheduleBugTarget(hitTarget, state.elapsedMs)
                return
            }

            Object.assign(
                hitTarget,
                createTarget(
                    state.gameId,
                    state.width,
                    state.height,
                    state.nextTargetId,
                ),
            )
            hitTarget.id = state.nextTargetId
            hitTarget.bornAt = state.elapsedMs
            state.nextTargetId += 1
        },
    }

    return state
}

function stepLaserTarget(
    state: EngineState,
    target: Target,
    deltaSeconds: number,
) {
    target.wobble += deltaSeconds * 2.5
    target.x += target.vx * deltaSeconds
    target.y += target.vy * deltaSeconds

    const minX = target.radius
    const maxX = state.width - target.radius
    const minY = target.radius
    const maxY = state.height - target.radius

    if (target.x <= minX || target.x >= maxX) {
        target.vx *= -1
        target.x = clamp(target.x, minX, maxX)
    }

    if (target.y <= minY || target.y >= maxY) {
        target.vy *= -1
        target.y = clamp(target.y, minY, maxY)
    }
}

function stepFishTarget(
    state: EngineState,
    target: Target,
    deltaSeconds: number,
) {
    if (state.elapsedMs >= target.laneSwitchAt) {
        const candidateLanes =
            target.laneIndex === 0
                ? [1]
                : target.laneIndex === FISH_LANES.length - 1
                  ? [FISH_LANES.length - 2]
                  : [target.laneIndex - 1, target.laneIndex + 1]
        const nextLane =
            candidateLanes[
                (target.id + Math.floor(state.elapsedMs / 240)) %
                    candidateLanes.length
            ]

        target.laneIndex = nextLane
        target.laneTargetY = FISH_LANES[nextLane]
        target.laneSwitchAt = state.elapsedMs + 760 + ((target.id * 83) % 260)
    }

    target.wobble += deltaSeconds * 3.2
    target.x += target.vx * deltaSeconds
    target.anchorY +=
        (target.laneTargetY - target.anchorY) * Math.min(1, deltaSeconds * 3.4)
    target.y = target.anchorY + Math.sin(target.wobble) * 20

    if (target.x > state.width + target.radius * 1.8) {
        target.x = -target.radius * 1.8
        target.bornAt = state.elapsedMs
    }
}

function stepFeatherTarget(target: Target, deltaSeconds: number) {
    target.wobble += deltaSeconds * 2.35
    target.x = target.anchorX + Math.sin(target.wobble) * 286
    target.y =
        target.anchorY -
        Math.cos(target.wobble) * 84 +
        Math.cos(target.wobble * 2) * 14
}

function stepBugTarget(state: EngineState, target: Target) {
    if (!target.visible && state.elapsedMs >= target.nextActiveAt) {
        target.visible = true
        target.bornAt = state.elapsedMs
    }

    if (target.visible && state.elapsedMs >= target.activeUntil) {
        rescheduleBugTarget(target, state.elapsedMs)
    }

    if (!target.visible) {
        return
    }

    const riseIn = clamp((state.elapsedMs - target.nextActiveAt) / 120, 0, 1)
    const fallOut = clamp((target.activeUntil - state.elapsedMs) / 120, 0, 1)
    const popProgress = Math.min(riseIn, fallOut)
    const wiggle = Math.sin(state.elapsedMs / 120 + target.wobble) * 6

    if (target.edge === "left") {
        target.x = target.anchorX + target.popDistance * popProgress
        target.y = target.anchorY + wiggle
    } else if (target.edge === "right") {
        target.x = target.anchorX - target.popDistance * popProgress
        target.y = target.anchorY + wiggle
    } else if (target.edge === "top") {
        target.x = target.anchorX + wiggle
        target.y = target.anchorY + target.popDistance * popProgress
    } else {
        target.x = target.anchorX + wiggle
        target.y = target.anchorY - target.popDistance * popProgress
    }
}

function stepTarget(state: EngineState, target: Target, deltaSeconds: number) {
    if (state.gameId === "laser") {
        stepLaserTarget(state, target, deltaSeconds)
        return
    }

    if (state.gameId === "fish") {
        stepFishTarget(state, target, deltaSeconds)
        return
    }

    if (state.gameId === "feather") {
        stepFeatherTarget(target, deltaSeconds)
        return
    }

    stepBugTarget(state, target)
}

export function updateGameState(
    state: EngineState,
    _definition: MiniGameDefinition,
    deltaMs: number,
) {
    if (state.completed) {
        return
    }

    const boundedDelta = Math.min(deltaMs, 48)
    state.elapsedMs += boundedDelta
    state.timeLeftMs = Math.max(0, state.durationMs - state.elapsedMs)

    const deltaSeconds = boundedDelta / 1000
    state.targets.forEach((target) => {
        stepTarget(state, target, deltaSeconds)
    })
    state.hitEffects = state.hitEffects
        .map((effect) => ({
            ...effect,
            ageMs: effect.ageMs + boundedDelta,
        }))
        .filter((effect) => effect.ageMs < effect.durationMs)

    if (state.timeLeftMs <= 0) {
        finishRound(state)
    }
}

function normalizeSignals(state: EngineState) {
    const accuracy = state.hits / Math.max(state.taps, 1)
    const effectiveDurationMs = Math.max(
        6000,
        Math.min(state.elapsedMs || state.durationMs, state.durationMs),
    )
    const averageReaction =
        state.reactions.length > 0
            ? state.reactions.reduce((sum, reaction) => sum + reaction, 0) /
              state.reactions.length
            : 1200
    const switchRate = state.targetSwitches / Math.max(state.hits, 1)
    const edgeRate = state.edgeHits / Math.max(state.hits, 1)
    const streakRate = state.maxStreak / 8

    const reaction = clamp(
        (1100 - averageReaction) / 780 + accuracy * 0.18,
        0,
        1,
    )
    const focus = clamp(
        state.focusTimeMs / effectiveDurationMs + accuracy * 0.22,
        0,
        1,
    )
    const ambush = clamp(
        edgeRate * 0.62 + reaction * 0.24 + switchRate * 0.18,
        0,
        1,
    )
    const tracking = clamp(
        accuracy * 0.42 + switchRate * 0.24 + streakRate * 0.34,
        0,
        1,
    )

    if (state.gameId === "laser") {
        return {
            reaction: clamp(reaction + 0.1, 0, 1),
            focus,
            ambush,
            tracking,
        }
    }

    if (state.gameId === "fish") {
        return {
            reaction,
            focus: clamp(focus + 0.1, 0, 1),
            ambush,
            tracking: clamp(tracking + 0.1, 0, 1),
        }
    }

    if (state.gameId === "feather") {
        return {
            reaction: clamp(reaction + 0.06, 0, 1),
            focus,
            ambush,
            tracking: clamp(tracking + 0.08, 0, 1),
        }
    }

    return { reaction, focus, ambush: clamp(ambush + 0.18, 0, 1), tracking }
}

export function buildGameResult(
    state: EngineState,
    definition: MiniGameDefinition,
): MiniGameResult {
    const averageReactionMs =
        state.reactions.length > 0
            ? state.reactions.reduce((sum, reaction) => sum + reaction, 0) /
              state.reactions.length
            : 1200

    const rawSignals: RawSignals = {
        hits: state.hits,
        misses: state.misses,
        taps: state.taps,
        averageReactionMs,
        focusTimeMs: state.focusTimeMs,
        edgeHits: state.edgeHits,
        targetSwitches: state.targetSwitches,
        streak: state.maxStreak,
    }

    return {
        gameId: definition.id,
        rawSignals,
        normalizedMetrics: normalizeSignals(state),
        completedAt: new Date().toISOString(),
    }
}

function drawBackground(ctx: CanvasRenderingContext2D, state: EngineState) {
    const gradient = ctx.createLinearGradient(0, 0, state.width, state.height)
    gradient.addColorStop(0, "#FFF8D6")
    gradient.addColorStop(0.55, "#FFF2E1")
    gradient.addColorStop(1, "#FFE2C9")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, state.width, state.height)

    for (let index = 0; index < 8; index += 1) {
        ctx.fillStyle =
            index % 2 === 0 ? "rgba(255,255,255,0.36)" : "rgba(255,220,181,0.3)"
        ctx.beginPath()
        ctx.arc(
            80 + index * 120,
            80 + (index % 3) * 150,
            24 + (index % 3) * 12,
            0,
            Math.PI * 2,
        )
        ctx.fill()
    }
}

function drawBugBurrow(ctx: CanvasRenderingContext2D, target: Target) {
    ctx.save()
    ctx.translate(target.anchorX, target.anchorY)
    ctx.fillStyle = "rgba(84, 135, 60, 0.22)"
    ctx.beginPath()
    ctx.arc(0, 0, target.radius * 1.6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "rgba(60, 97, 40, 0.32)"
    ctx.beginPath()
    ctx.arc(0, 0, target.radius * 1.05, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
}

function drawHitEffect(ctx: CanvasRenderingContext2D, effect: HitEffect) {
    const progress = clamp(effect.ageMs / effect.durationMs, 0, 1)
    const fade = 1 - progress

    ctx.save()

    if (effect.kind === "laser") {
        ctx.strokeStyle = `rgba(255, 101, 72, ${0.55 * fade})`
        ctx.lineWidth = 6 - progress * 3
        ctx.beginPath()
        ctx.arc(effect.x, effect.y, 16 + progress * 44, 0, Math.PI * 2)
        ctx.stroke()

        ctx.fillStyle = `rgba(255, 213, 146, ${0.22 * fade})`
        ctx.beginPath()
        ctx.arc(effect.x, effect.y, 18 + progress * 26, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
        return
    }

    if (effect.kind === "fish") {
        ctx.strokeStyle = `rgba(105, 210, 255, ${0.38 * fade})`
        ctx.lineWidth = 4 - progress * 1.5
        for (const offset of [0, 18]) {
            ctx.beginPath()
            ctx.arc(
                effect.x,
                effect.y,
                12 + progress * 34 + offset * progress * 0.2,
                0,
                Math.PI * 2,
            )
            ctx.stroke()
        }
        ctx.restore()
        return
    }

    if (effect.kind === "feather") {
        ctx.fillStyle = `rgba(255, 193, 217, ${0.52 * fade})`
        for (let index = 0; index < 5; index += 1) {
            const angle = effect.seed + index * ((Math.PI * 2) / 5)
            const drift = 10 + progress * 32
            const x = effect.x + Math.cos(angle) * drift
            const y = effect.y + Math.sin(angle) * drift * 0.6
            ctx.beginPath()
            ctx.ellipse(
                x,
                y,
                10 - progress * 3,
                4.8 - progress * 1.4,
                angle,
                0,
                Math.PI * 2,
            )
            ctx.fill()
        }
        ctx.restore()
        return
    }

    const shake =
        (effect.edge === "left" || effect.edge === "right" ? 1 : 0) *
        Math.sin(progress * 18) *
        6 *
        fade
    const verticalShake =
        (effect.edge === "top" || effect.edge === "bottom" ? 1 : 0) *
        Math.sin(progress * 18) *
        6 *
        fade

    ctx.strokeStyle = `rgba(86, 150, 72, ${0.44 * fade})`
    ctx.lineWidth = 5 - progress * 2
    ctx.beginPath()
    ctx.arc(
        effect.anchorX + shake,
        effect.anchorY + verticalShake,
        30 + progress * 16,
        0,
        Math.PI * 2,
    )
    ctx.stroke()
    ctx.restore()
}

function drawTarget(
    ctx: CanvasRenderingContext2D,
    state: EngineState,
    target: Target,
) {
    if (!target.visible) {
        return
    }

    ctx.save()
    ctx.translate(target.x, target.y)

    if (state.gameId === "laser") {
        ctx.fillStyle = target.hue
        ctx.beginPath()
        ctx.arc(0, 0, target.radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowColor = "#FF5A3C"
        ctx.shadowBlur = 18
        ctx.beginPath()
        ctx.arc(0, 0, target.radius * 0.5, 0, Math.PI * 2)
        ctx.fillStyle = "#FFF1D8"
        ctx.fill()
    } else if (state.gameId === "fish") {
        ctx.fillStyle = target.hue
        ctx.beginPath()
        ctx.ellipse(
            0,
            0,
            target.radius * 1.1,
            target.radius * 0.7,
            0,
            0,
            Math.PI * 2,
        )
        ctx.fill()
        ctx.beginPath()
        ctx.moveTo(target.radius * 1.05, 0)
        ctx.lineTo(target.radius * 1.8, target.radius * 0.55)
        ctx.lineTo(target.radius * 1.8, -target.radius * 0.55)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = "#0B5279"
        ctx.beginPath()
        ctx.arc(-target.radius * 0.35, -target.radius * 0.1, 4, 0, Math.PI * 2)
        ctx.fill()
    } else if (state.gameId === "feather") {
        ctx.strokeStyle = "#FF75A1"
        ctx.lineWidth = 6
        ctx.beginPath()
        ctx.moveTo(-target.radius * 0.1, target.radius * 0.9)
        ctx.lineTo(target.radius * 0.2, -target.radius * 0.9)
        ctx.stroke()
        ctx.fillStyle = "#FFD5E6"
        ctx.beginPath()
        ctx.ellipse(
            -target.radius * 0.18,
            -target.radius * 0.05,
            target.radius * 0.7,
            target.radius * 0.42,
            -0.9,
            0,
            Math.PI * 2,
        )
        ctx.fill()
        ctx.beginPath()
        ctx.ellipse(
            target.radius * 0.18,
            target.radius * 0.18,
            target.radius * 0.55,
            target.radius * 0.34,
            0.8,
            0,
            Math.PI * 2,
        )
        ctx.fill()
    } else {
        ctx.fillStyle = target.hue
        ctx.beginPath()
        ctx.ellipse(0, 0, target.radius * 0.8, target.radius, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = "#2E6A2D"
        ctx.lineWidth = 4
        for (const side of [-1, 1]) {
            ctx.beginPath()
            ctx.moveTo(side * 10, -6)
            ctx.lineTo(side * 28, -18)
            ctx.moveTo(side * 12, 2)
            ctx.lineTo(side * 30, 6)
            ctx.moveTo(side * 8, 12)
            ctx.lineTo(side * 26, 24)
            ctx.stroke()
        }
    }

    ctx.restore()
}

export function drawGameFrame(canvas: HTMLCanvasElement, state: EngineState) {
    const context = canvas.getContext("2d")
    if (!context) {
        return
    }

    drawBackground(context, state)

    if (state.gameId === "bug") {
        state.targets.forEach((target) => drawBugBurrow(context, target))
    }

    state.targets.forEach((target) => drawTarget(context, state, target))
    state.hitEffects.forEach((effect) => drawHitEffect(context, effect))
}
