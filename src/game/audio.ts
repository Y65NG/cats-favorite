import type { GameId } from './types'

export type GameSoundProfile = {
  waveform: OscillatorType
  hitStartHz: number
  hitEndHz: number
  missStartHz: number
  missEndHz: number
  startNotesHz: number[]
  completeNotesHz: number[]
  hitDurationMs: number
  completeDurationMs: number
  volume: number
}

const SOUND_PROFILES: Record<GameId, GameSoundProfile> = {
  laser: {
    waveform: 'square',
    hitStartHz: 980,
    hitEndHz: 1420,
    missStartHz: 240,
    missEndHz: 170,
    startNotesHz: [740, 988],
    completeNotesHz: [988, 1318, 1661],
    hitDurationMs: 64,
    completeDurationMs: 112,
    volume: 0.11,
  },
  fish: {
    waveform: 'sine',
    hitStartHz: 540,
    hitEndHz: 760,
    missStartHz: 210,
    missEndHz: 150,
    startNotesHz: [466, 587],
    completeNotesHz: [587, 698, 880],
    hitDurationMs: 132,
    completeDurationMs: 176,
    volume: 0.1,
  },
  feather: {
    waveform: 'sine',
    hitStartHz: 680,
    hitEndHz: 860,
    missStartHz: 220,
    missEndHz: 160,
    startNotesHz: [554, 698],
    completeNotesHz: [698, 880, 1108],
    hitDurationMs: 118,
    completeDurationMs: 168,
    volume: 0.095,
  },
  bug: {
    waveform: 'triangle',
    hitStartHz: 440,
    hitEndHz: 560,
    missStartHz: 190,
    missEndHz: 140,
    startNotesHz: [370, 466],
    completeNotesHz: [466, 587, 698],
    hitDurationMs: 74,
    completeDurationMs: 120,
    volume: 0.085,
  },
}

type AudioContextCtor = typeof AudioContext

type WindowWithWebAudio = Window &
  typeof globalThis & {
    webkitAudioContext?: AudioContextCtor
  }

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') {
    return null
  }

  return window.AudioContext ?? (window as WindowWithWebAudio).webkitAudioContext ?? null
}

export function getGameSoundProfile(gameId: GameId) {
  return SOUND_PROFILES[gameId]
}

class GameAudioController {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private enabled = true

  isEnabled() {
    return this.enabled
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled

    if (!this.context || !this.master) {
      return
    }

    this.master.gain.setTargetAtTime(
      enabled ? 0.18 : 0,
      this.context.currentTime,
      0.02,
    )
  }

  async resume() {
    const context = this.ensureContext()
    if (!context || !this.enabled) {
      return
    }

    if (context.state === 'suspended') {
      try {
        await context.resume()
      } catch {
        return
      }
    }
  }

  playStart(gameId: GameId) {
    const profile = getGameSoundProfile(gameId)
    profile.startNotesHz.forEach((frequency, index) => {
      this.playTone({
        waveform: profile.waveform,
        startHz: frequency,
        endHz: frequency * 1.05,
        durationMs: 90,
        volume: profile.volume,
        delayMs: index * 80,
      })
    })
  }

  playHit(gameId: GameId, streak: number) {
    const profile = getGameSoundProfile(gameId)
    const lift = Math.min(streak, 8) * 18

      this.playTone({
      waveform: profile.waveform,
      startHz: profile.hitStartHz + lift,
      endHz: profile.hitEndHz + lift,
      durationMs: profile.hitDurationMs,
      volume: profile.volume,
    })
  }

  playMiss(gameId: GameId) {
    const profile = getGameSoundProfile(gameId)

    this.playTone({
      waveform: 'triangle',
      startHz: profile.missStartHz,
      endHz: profile.missEndHz,
      durationMs: 140,
      volume: 0.08,
    })
  }

  playComplete(gameId: GameId) {
    const profile = getGameSoundProfile(gameId)
    profile.completeNotesHz.forEach((frequency, index) => {
      this.playTone({
        waveform: profile.waveform,
        startHz: frequency,
        endHz: frequency * 1.04,
        durationMs: profile.completeDurationMs,
        volume: profile.volume,
        delayMs: index * 95,
      })
    })
  }

  private ensureContext() {
    const AudioContextImpl = getAudioContextCtor()
    if (!AudioContextImpl) {
      return null
    }

    if (!this.context) {
      this.context = new AudioContextImpl()
      this.master = this.context.createGain()
      this.master.gain.value = this.enabled ? 0.18 : 0
      this.master.connect(this.context.destination)
    }

    return this.context
  }

  private playTone(input: {
    waveform: OscillatorType
    startHz: number
    endHz: number
    durationMs: number
    volume: number
    delayMs?: number
  }) {
    const context = this.ensureContext()
    if (!context || !this.master || !this.enabled || context.state !== 'running') {
      return
    }

    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const startTime = context.currentTime + (input.delayMs ?? 0) / 1000
    const endTime = startTime + input.durationMs / 1000

    oscillator.type = input.waveform
    oscillator.frequency.setValueAtTime(input.startHz, startTime)
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(80, input.endHz),
      endTime,
    )

    gain.gain.setValueAtTime(0.0001, startTime)
    gain.gain.exponentialRampToValueAtTime(input.volume, startTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, endTime)

    oscillator.connect(gain)
    gain.connect(this.master)
    oscillator.start(startTime)
    oscillator.stop(endTime + 0.02)
  }
}

export const gameAudio = new GameAudioController()
