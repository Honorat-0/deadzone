import type { Settings, WeaponId } from './types'

export class GameAudio {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  settings: Settings

  constructor(settings: Settings) { this.settings = settings }

  unlock() {
    try {
      if (!this.context) {
        this.context = new AudioContext()
        this.master = this.context.createGain()
        this.master.connect(this.context.destination)
      }
      this.master!.gain.value = this.settings.volume / 100 * 0.36
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {})
    } catch { /* Audio is optional when the browser does not support it. */ }
  }

  configure(settings: Settings) {
    this.settings = settings
    if (this.master) this.master.gain.value = settings.volume / 100 * 0.36
  }

  private tone(frequency: number, duration: number, volume = 0.25, end = frequency, delay = 0, type: OscillatorType = 'triangle') {
    const c = this.context
    if (!c || !this.master || !this.settings.sound || c.state !== 'running') return
    const time = c.currentTime + delay
    const o = c.createOscillator()
    const g = c.createGain()
    o.type = type
    o.frequency.setValueAtTime(frequency, time)
    o.frequency.exponentialRampToValueAtTime(Math.max(15, end), time + duration)
    g.gain.setValueAtTime(volume, time)
    g.gain.exponentialRampToValueAtTime(0.001, time + duration)
    o.connect(g).connect(this.master)
    o.start(time); o.stop(time + duration + 0.01)
  }

  private noise(duration: number, volume: number, cutoff: number) {
    const c = this.context
    if (!c || !this.master || !this.settings.sound || c.state !== 'running') return
    const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * duration), c.sampleRate)
    const samples = buffer.getChannelData(0)
    for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / samples.length)
    const source = c.createBufferSource()
    const filter = c.createBiquadFilter()
    const gain = c.createGain()
    source.buffer = buffer; filter.type = 'lowpass'; filter.frequency.value = cutoff
    gain.gain.value = volume
    source.connect(filter).connect(gain).connect(this.master)
    source.start(); source.stop(c.currentTime + duration)
  }

  fire(weapon: WeaponId) {
    this.noise(weapon === 'shotgun' ? 0.2 : 0.075, weapon === 'shotgun' ? 0.75 : 0.35, 1800)
    this.tone(weapon === 'shotgun' ? 105 : 180, 0.11, 0.3, 35, 0, 'sawtooth')
  }
  dash() { this.noise(0.2, 0.22, 3200); this.tone(280, 0.18, 0.1, 70) }
  hit() { this.noise(0.1, 0.2, 1300); this.tone(90, 0.11, 0.22, 40) }
  pickup() { this.tone(600, 0.13, 0.2); this.tone(900, 0.22, 0.18, 900, 0.1) }
  reload() { this.noise(0.055, 0.15, 2200); this.tone(380, 0.06, 0.05) }
  explode() { this.noise(0.6, 0.8, 750); this.tone(80, 0.45, 0.5, 20, 0, 'sawtooth') }
  wave() { this.tone(440, 0.15, 0.13); this.tone(550, 0.15, 0.13, 550, 0.16); this.tone(660, 0.3, 0.13, 660, 0.32) }
  death() { this.tone(220, 0.6, 0.3, 30, 0, 'sawtooth'); this.noise(0.4, 0.5, 400) }
  dispose() { if (this.context) void this.context.close().catch(() => {}) }
}