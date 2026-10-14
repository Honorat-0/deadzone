export type Phase = 'ready' | 'playing' | 'paused' | 'dead' | 'extracted'
export type WeaponId = 'pistol' | 'shotgun' | 'smg'
export type EnemyKind = 'lurker' | 'runner' | 'gunner' | 'brute'
export type LootKind = WeaponId | 'ammo' | 'medkit' | 'cache'

export interface Point { x: number; y: number }
export interface Rect extends Point { w: number; h: number }
export interface Solid extends Rect { kind: 'wall' | 'tree' | 'rock' }
export interface Prop extends Point { kind: 'barrel' | 'crate'; health: number; active: boolean }
export interface Loot extends Point { id: number; kind: LootKind; active: boolean }

export interface Settings {
  sound: boolean
  volume: number
  shake: boolean
  particles: boolean
}

export const DEFAULT_SETTINGS: Settings = { sound: true, volume: 55, shake: true, particles: true }

export interface Weapon {
  id: WeaponId
  name: string
  shortName: string
  capacity: number
  interval: number
  reload: number
  damage: number
  spread: number
  pellets: number
  speed: number
  color: string
}

export const WEAPONS: Weapon[] = [
  { id: 'pistol', name: 'P9 Sidearm', shortName: 'SIDEARM', capacity: 12, interval: 0.27, reload: 1.05, damage: 27, spread: 0.025, pellets: 1, speed: 430, color: '#eacb8a' },
  { id: 'shotgun', name: 'Sawed-off', shortName: 'SHOTGUN', capacity: 6, interval: 0.7, reload: 1.6, damage: 17, spread: 0.24, pellets: 7, speed: 370, color: '#ff9756' },
  { id: 'smg', name: 'VX-9 SMG', shortName: 'SMG', capacity: 30, interval: 0.085, reload: 1.35, damage: 14, spread: 0.085, pellets: 1, speed: 480, color: '#b5d2bb' },
]

export interface WeaponStatus {
  owned: boolean
  ammo: number
  reserve: number
}

export interface RunRecord {
  id: string
  score: number
  kills: number
  wave: number
  seconds: number
  extracted: boolean
  date: string
}

export interface GameSnapshot {
  phase: Phase
  health: number
  stamina: number
  dash: number
  wave: number
  waveKills: number
  waveTotal: number
  enemies: number
  kills: number
  score: number
  seconds: number
  activeWeapon: number
  weapons: WeaponStatus[]
  reload: number
  prompt: string
  notice: string
  waveBreak: number
  extractionOpen: boolean
  player: Point
  enemyPositions: Point[]
  lootPositions: Point[]
}

export const INITIAL_SNAPSHOT: GameSnapshot = {
  phase: 'ready', health: 100, stamina: 100, dash: 1,
  wave: 1, waveKills: 0, waveTotal: 7, enemies: 7, kills: 0, score: 0,
  seconds: 0, activeWeapon: 0,
  weapons: [{ owned: true, ammo: 12, reserve: -1 }, { owned: false, ammo: 6, reserve: 36 }, { owned: false, ammo: 30, reserve: 150 }],
  reload: 0, prompt: '', notice: '', waveBreak: 0, extractionOpen: false,
  player: { x: 640, y: 496 }, enemyPositions: [], lootPositions: [],
}

export const formatTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`