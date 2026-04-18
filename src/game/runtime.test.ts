import { describe, expect, it } from 'vitest'
import { GAME_MAP } from './catalog'
import { createEngineState, getRoundConfig, updateGameState } from './runtime'

describe('game completion rules', () => {
  it('uses distinct pacing targets for different games', () => {
    expect(getRoundConfig('laser')).toMatchObject({ hitGoal: 14, durationMs: 32000 })
    expect(getRoundConfig('fish')).toMatchObject({ hitGoal: 10, durationMs: 42000 })
    expect(getRoundConfig('feather')).toMatchObject({ hitGoal: 16, durationMs: 36000 })
    expect(getRoundConfig('bug')).toMatchObject({ hitGoal: 8, durationMs: 50000 })
  })

  it('finishes a round once the hit target is reached instead of relying only on a short timer', () => {
    const state = createEngineState('laser')

    expect(state.hitGoal).toBeGreaterThan(0)
    expect(state.durationMs).toBeGreaterThan(30000)

    for (let index = 0; index < state.hitGoal; index += 1) {
      const target = state.targets[0]
      state.pointerDown(target.x, target.y)
    }

    expect(state.hits).toBe(state.hitGoal)
    expect(state.completed).toBe(true)
    expect(state.elapsedMs).toBeLessThan(state.durationMs)
  })

  it('spawns hit feedback effects and lets them fade out over time', () => {
    const state = createEngineState('laser')
    const target = state.targets[0]

    state.pointerDown(target.x, target.y)

    expect(state.hitEffects).toHaveLength(1)
    expect(state.hitEffects[0]?.kind).toBe('laser')

    for (let index = 0; index < 8; index += 1) {
      updateGameState(state, GAME_MAP.laser, 48)
    }

    expect(state.hitEffects).toHaveLength(0)
  })
})

describe('bug game runtime', () => {
  it('uses fixed edge burrows and pop-up visibility instead of free roaming motion', () => {
    const state = createEngineState('bug')
    const anchors = state.targets.map((target) => ({
      x: target.anchorX,
      y: target.anchorY,
      edge: target.edge,
    }))

    updateGameState(state, GAME_MAP.bug, 900)

    expect(
      state.targets.every((target, index) => {
        const anchor = anchors[index]
        return target.anchorX === anchor.x && target.anchorY === anchor.y && target.edge === anchor.edge
      }),
    ).toBe(true)
    expect(state.targets.some((target) => target.visible)).toBe(true)
    expect(state.targets.some((target) => !target.visible)).toBe(true)
    expect(
      state.targets.every((target) => target.activeUntil - target.nextActiveAt >= 460),
    ).toBe(true)
    expect(
      state.targets.every(
        (target) =>
          target.edge === 'left' ||
          target.edge === 'right' ||
          target.edge === 'top' ||
          target.edge === 'bottom',
      ),
    ).toBe(true)
  })
})

describe('feather game runtime', () => {
  it('swings in a wide pendulum-like arc instead of drifting like the other games', () => {
    const state = createEngineState('feather')
    const positions: Array<{ x: number; y: number }> = []

    for (let index = 0; index < 70; index += 1) {
      updateGameState(state, GAME_MAP.feather, 48)
      if (index % 7 === 0) {
        positions.push({ x: state.targets[0].x, y: state.targets[0].y })
      }
    }

    const xValues = positions.map((position) => position.x)
    const yValues = positions.map((position) => position.y)

    expect(Math.max(...xValues) - Math.min(...xValues)).toBeGreaterThan(420)
    expect(Math.max(...yValues) - Math.min(...yValues)).toBeLessThan(220)
    expect(xValues.some((value) => value > state.width / 2 + 160)).toBe(true)
    expect(xValues.some((value) => value < state.width / 2 - 160)).toBe(true)
  })
})

describe('fish game runtime', () => {
  it('changes lanes over time so the school feels distinct from simple horizontal drift', () => {
    const state = createEngineState('fish')
    const initialLanes = state.targets.map((target) => target.anchorY)
    const laneSnapshots: number[][] = []

    for (let index = 0; index < 90; index += 1) {
      updateGameState(state, GAME_MAP.fish, 48)
      if (index % 9 === 0) {
        laneSnapshots.push(state.targets.map((target) => Math.round(target.anchorY)))
      }
    }

    expect(
      state.targets.some((target, index) => Math.abs(target.anchorY - initialLanes[index]) > 60),
    ).toBe(true)
    expect(
      laneSnapshots.some((snapshot) => new Set(snapshot).size === 2 || new Set(snapshot).size === 3),
    ).toBe(true)
  })
})
