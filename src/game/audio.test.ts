import { describe, expect, it } from 'vitest'
import { getGameSoundProfile } from './audio'

describe('game audio profiles', () => {
  it('defines distinct sound presets for each game', () => {
    const laser = getGameSoundProfile('laser')
    const fish = getGameSoundProfile('fish')
    const feather = getGameSoundProfile('feather')
    const bug = getGameSoundProfile('bug')

    expect(laser.waveform).not.toBe(fish.waveform)
    expect(feather.hitStartHz).not.toBe(laser.hitStartHz)
    expect(bug.completeNotesHz).toHaveLength(3)
    expect(fish.startNotesHz[0]).toBeLessThan(feather.startNotesHz[0])
  })
})
