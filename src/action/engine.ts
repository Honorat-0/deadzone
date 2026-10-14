import { GameAudio } from './audio'
import { drawBeacon, drawEnemy, drawLoot, drawPlayer, drawProp, light, lootLabel } from './art'
import { circleHitsRect, createWorld, EXTRACTION, SPAWN, WORLD_H, WORLD_W, type World } from './world'
import { DEFAULT_SETTINGS, WEAPONS, type EnemyKind, type GameSnapshot, type Loot, type Phase, type Point, type Prop, type RunRecord, type Settings, type WeaponStatus } from './types'

interface Player extends Point {
  health: number; angle: number; walk: number; moving: boolean
  invincible: number; dashTime: number; dashCooldown: number
  dashX: number; dashY: number; stamina: number; shootTimer: number
  muzzle: number; activeWeapon: number; reloadTimer: number; reloadTotal: number
}
interface Enemy extends Point {
  id: number; kind: EnemyKind; health: number; maxHealth: number
  speed: number; radius: number; angle: number; walk: number; hit: number
  attack: number; alive: boolean
}
interface Bullet extends Point { vx: number; vy: number; damage: number; life: number; enemy: boolean; color: string }
interface Particle extends Point { vx: number; vy: number; life: number; maxLife: number; size: number; color: string }
interface Ghost extends Point { angle: number; life: number }
interface Corpse extends Point { angle: number; kind: EnemyKind; time: number }

const WAVE_COUNTS = [7, 10, 13, 16, 19]
const NAV = 16
const COLS = WORLD_W / NAV
const ROWS = WORLD_H / NAV
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export class ActionEngine {
  phase: Phase = 'ready'
  settings: Settings = { ...DEFAULT_SETTINGS }
  private c: CanvasRenderingContext2D
  private world: World
  private initialProps: Prop[]
  private initialLoot: Loot[]
  private audio: GameAudio
  private player!: Player
  private weapons!: WeaponStatus[]
  private enemies: Enemy[] = []
  private bullets: Bullet[] = []
  private particles: Particle[] = []
  private ghosts: Ghost[] = []
  private corpses: Corpse[] = []
  private keys = new Set<string>()
  private stick = { x: 0, y: 0 }
  private pointer = { x: 0, y: 0, active: false, down: false }
  private touchFire = false
  private width = 600
  private height = 300
  private camera = { x: 340, y: 325 }
  private view = { x: 340, y: 325 }
  private time = 0
  private seconds = 0
  private wave = 1
  private kills = 0
  private waveKills = 0
  private score = 0
  private waveBreak = 0
  private extractionOpen = false
  private notice = ''
  private noticeTime = 0
  private prompt = ''
  private shake = 0
  private damageFlash = 0
  private hudTimer = 0
  private navTimer = 0
  private ghostTimer = 0
  private nextId = 10
  private frame = 0
  private lastFrame = 0
  private disposed = false
  private recorded = false
  private blocked = new Uint8Array(COLS * ROWS)
  private flow = new Int16Array(COLS * ROWS)
  private queue = new Int16Array(COLS * ROWS)
  private onSnapshot: (snapshot: GameSnapshot) => void
  private onFinish: (record: RunRecord) => void

  constructor(private canvas: HTMLCanvasElement, onSnapshot: (s: GameSnapshot) => void, onFinish: (r: RunRecord) => void, settings: Settings) {
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) throw new Error('This game needs a browser with Canvas 2D support.')
    this.c = context
    this.onSnapshot = onSnapshot
    this.onFinish = onFinish
    this.world = createWorld()
    this.initialProps = this.world.props.map((p) => ({ ...p }))
    this.initialLoot = this.world.loot.map((p) => ({ ...p }))
    this.settings = settings
    this.audio = new GameAudio(settings)
    this.resetReady()
    this.resize()
    this.frame = requestAnimationFrame(this.loop)
  }

  resize() {
    const r = this.canvas.getBoundingClientRect()
    this.width = Math.max(150, Math.round(r.width / 2))
    this.height = Math.max(120, Math.round(r.height / 2))
    this.canvas.width = this.width
    this.canvas.height = this.height
    this.c.imageSmoothingEnabled = false
    this.centerCamera(true)
    this.render()
  }

  configure(settings: Settings) {
    this.settings = settings; this.audio.configure(settings)
    if (!settings.particles) { this.particles = []; this.ghosts = [] }
  }

  private freshPlayer(): Player {
    return { ...SPAWN, health: 100, angle: -0.35, walk: 0, moving: false,
      invincible: 0, dashTime: 0, dashCooldown: 0, dashX: 1, dashY: 0,
      stamina: 100, shootTimer: 0, muzzle: 0, activeWeapon: 0, reloadTimer: 0, reloadTotal: 0 }
  }

  resetReady() {
    this.phase = 'ready'
    this.player = this.freshPlayer()
    this.weapons = [{ owned: true, ammo: 12, reserve: -1 }, { owned: false, ammo: 6, reserve: 36 }, { owned: false, ammo: 30, reserve: 150 }]
    this.world.props = this.initialProps.map((p) => ({ ...p }))
    this.world.loot = this.initialLoot.map((p) => ({ ...p }))
    this.seconds = 0; this.wave = 1; this.kills = 0; this.score = 0; this.waveKills = 0
    this.waveBreak = 0; this.extractionOpen = false; this.recorded = false
    this.notice = ''; this.noticeTime = 0; this.prompt = ''; this.shake = 0; this.damageFlash = 0
    this.bullets = []; this.particles = []; this.ghosts = []; this.corpses = []
    this.navTimer = 0; this.ghostTimer = 0
    this.clearInput(); this.buildNavigation(); this.computeFlow(); this.spawnWave(true)
    this.centerCamera(true); this.publish()
  }

  start() {
    this.audio.unlock()
    this.resetReady()
    this.phase = 'playing'
    this.showNotice('WAVE 01 / THE OUTPOST IS NOT EMPTY', 3)
    this.audio.wave()
    this.publish()
  }

  pause() {
    if (this.phase !== 'playing') return
    this.phase = 'paused'; this.clearInput(); this.publish()
  }

  resume() {
    if (this.phase !== 'paused') return
    this.audio.unlock(); this.phase = 'playing'; this.publish()
  }

  togglePause() { if (this.phase === 'paused') this.resume(); else this.pause() }

  clearInput() { this.keys.clear(); this.pointer.down = false; this.touchFire = false; this.stick = { x: 0, y: 0 } }

  setKey(code: string, down: boolean) {
    if (!down) { this.keys.delete(code); return }
    if (this.keys.has(code)) return
    if (code === 'Escape' || code === 'KeyP') { this.togglePause(); return }
    if (this.phase === 'ready' || this.phase === 'dead' || this.phase === 'extracted') {
      if (code === 'Enter' || code === 'Space') this.start()
      return
    }
    if (this.phase === 'paused') { if (code === 'Space' || code === 'Enter') this.resume(); return }
    this.keys.add(code)
    if (code === 'Space') this.dash()
    if (code === 'KeyR') this.reload()
    if (code === 'KeyE') this.interact()
    if (code.startsWith('Digit')) this.selectWeapon(Number(code.slice(5)) - 1)
    if (code === 'KeyQ') {
      for (let i = 1; i <= 3; i++) {
        const next = (this.player.activeWeapon + i) % 3
        if (this.weapons[next].owned) { this.selectWeapon(next); break }
      }
    }
  }

  pointerMove(clientX: number, clientY: number) {
    const r = this.canvas.getBoundingClientRect()
    this.pointer.x = (clientX - r.left) / r.width * this.width
    this.pointer.y = (clientY - r.top) / r.height * this.height
    this.pointer.active = true
  }
  pointerDown(down: boolean) { this.pointer.down = down && this.phase === 'playing'; if (down) this.audio.unlock() }
  pointerLeave() { this.pointer.active = false }
  setStick(x: number, y: number) { this.stick = { x, y } }
  setTouchFire(down: boolean) { this.touchFire = down; if (down) this.audio.unlock() }

  selectWeapon(index: number) {
    if (this.phase !== 'playing' && this.phase !== 'paused') return
    if (!this.weapons[index]?.owned) { this.showNotice('Find this weapon in the outpost.'); return }
    if (this.player.activeWeapon !== index) {
      this.player.activeWeapon = index; this.player.reloadTimer = 0; this.player.shootTimer = 0.1
      this.audio.reload(); this.publish()
    }
  }

  reload() {
    if (this.phase !== 'playing') return
    const p = this.player, gun = WEAPONS[p.activeWeapon], status = this.weapons[p.activeWeapon]
    if (p.reloadTimer > 0 || status.ammo === gun.capacity || status.reserve === 0) return
    p.reloadTotal = gun.reload; p.reloadTimer = gun.reload
    this.audio.reload(); this.publish()
  }

  dash() {
    const p = this.player
    if (this.phase !== 'playing' || p.dashCooldown > 0 || p.dashTime > 0) return
    const move = this.movement()
    const length = Math.hypot(move.x, move.y)
    p.dashX = length > 0.05 ? move.x / length : Math.cos(p.angle)
    p.dashY = length > 0.05 ? move.y / length : Math.sin(p.angle)
    p.dashTime = 0.18; p.dashCooldown = 1.2; this.audio.dash()
    this.burst(p.x, p.y, 12, '#d9d7a3', 55)
  }

  interact() {
    if (this.phase !== 'playing') return
    if (this.extractionOpen && distance(this.player, EXTRACTION) < 40) { this.finish(true); return }
    const item = this.closestLoot()
    if (!item) return
    if (item.kind === 'medkit') {
      if (this.player.health >= 100) { this.showNotice('Health is already full.'); return }
      this.player.health = Math.min(100, this.player.health + 35)
      this.showNotice('MEDKIT / +35 HEALTH')
    } else if (item.kind === 'ammo') {
      this.addAmmo(); this.showNotice('RESUPPLIED / AMMO RECOVERED')
    } else {
      const index = item.kind === 'cache' ? (this.weapons[2].owned ? 1 : 2) : WEAPONS.findIndex((w) => w.id === item.kind)
      this.weapons[index].owned = true
      this.weapons[index].ammo = WEAPONS[index].capacity
      if (this.weapons[index].reserve >= 0) this.weapons[index].reserve += WEAPONS[index].capacity * 2
      this.player.activeWeapon = index; this.player.reloadTimer = 0
      this.showNotice(`${WEAPONS[index].name.toUpperCase()} / WEAPON ACQUIRED`)
    }
    item.active = false; this.audio.pickup(); this.burst(item.x, item.y, 18, '#f1bb78', 42); this.publish()
  }

  private addAmmo() {
    this.weapons.forEach((status, i) => { if (i > 0) status.reserve += WEAPONS[i].capacity * 3 })
  }

  private closestLoot(): Loot | undefined {
    let closest: Loot | undefined, best = 43
    for (const item of this.world.loot) {
      if (!item.active) continue
      const d = distance(this.player, item)
      if (d < best && this.lineOfSight(this.player, item)) { closest = item; best = d }
    }
    return closest
  }

  private movement() {
    return {
      x: this.stick.x + (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0) - (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0),
      y: this.stick.y + (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0) - (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0),
    }
  }

  private blockedAt(x: number, y: number, radius: number, includeProps = true) {
    if (x < 26 + radius || x > WORLD_W - 26 - radius || y < 26 + radius || y > WORLD_H - 26 - radius) return true
    if (this.world.solids.some((r) => circleHitsRect(x, y, radius, r))) return true
    return includeProps && this.world.props.some((p) => p.active && Math.hypot(p.x - x, p.y - y) < radius + (p.kind === 'crate' ? 11 : 7))
  }

  private move(entity: Point, dx: number, dy: number, radius: number) {
    // Substeps keep a fast dash from passing through thin walls.
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 4))
    for (let i = 0; i < steps; i++) {
      if (!this.blockedAt(entity.x + dx / steps, entity.y, radius)) entity.x += dx / steps
      if (!this.blockedAt(entity.x, entity.y + dy / steps, radius)) entity.y += dy / steps
    }
  }

  private buildNavigation() {
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      this.blocked[y * COLS + x] = this.blockedAt(x * NAV + 8, y * NAV + 8, 13) ? 1 : 0
    }
  }

  // A shared breadth-first flow field routes every enemy around the ruins.
  private computeFlow() {
    this.flow.fill(-1)
    const sx = clamp(Math.floor(this.player.x / NAV), 1, COLS - 2)
    const sy = clamp(Math.floor(this.player.y / NAV), 1, ROWS - 2)
    let start = sy * COLS + sx
    if (this.blocked[start]) {
      let alternative = -1, nearest = Infinity
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        const x = sx + dx, y = sy + dy
        if (x < 0 || y < 0 || x >= COLS || y >= ROWS) continue
        const index = y * COLS + x, d = dx * dx + dy * dy
        if (!this.blocked[index] && d < nearest) { alternative = index; nearest = d }
      }
      if (alternative < 0) return
      start = alternative
    }
    let head = 0, tail = 1
    this.queue[0] = start; this.flow[start] = 0
    while (head < tail) {
      const current = this.queue[head++]
      const x = current % COLS, y = Math.floor(current / COLS)
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy
        if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue
        const next = ny * COLS + nx
        if (this.blocked[next] || this.flow[next] !== -1) continue
        this.flow[next] = this.flow[current] + 1
        this.queue[tail++] = next
      }
    }
  }

  private lineOfSight(a: Point, b: Point) {
    const d = distance(a, b), steps = Math.ceil(d / 10)
    for (let i = 1; i < steps; i++) {
      const x = lerp(a.x, b.x, i / steps), y = lerp(a.y, b.y, i / steps)
      if (this.world.solids.some((r) => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h)) return false
      if (this.world.props.some((p) => p.active && Math.hypot(p.x - x, p.y - y) < (p.kind === 'crate' ? 11 : 7))) return false
    }
    return true
  }

  private spawnWave(preview = false) {
    this.enemies = []
    this.waveKills = 0
    const count = WAVE_COUNTS[this.wave - 1]
    const previews = [[752, 402], [506, 379], [792, 574], [476, 479], [674, 640], [777, 249], [907, 461]]
    for (let i = 0; i < count; i++) {
      let point = { x: 0, y: 0 }
      if (preview && previews[i]) point = { x: previews[i][0], y: previews[i][1] }
      else {
        let found = false
        for (let tries = 0; tries < 120; tries++) {
          const angle = Math.random() * Math.PI * 2
          const radius = 180 + Math.random() * 180
          const x = clamp(this.player.x + Math.cos(angle) * radius, 64, WORLD_W - 64)
          const y = clamp(this.player.y + Math.sin(angle) * radius, 64, WORLD_H - 64)
          const cell = Math.floor(y / NAV) * COLS + Math.floor(x / NAV)
          if (!this.blockedAt(x, y, 14) && this.flow[cell] >= 0 && distance({ x, y }, this.player) > 140) {
            point = { x, y }; found = true; break
          }
        }
        if (!found) {
          for (let cell = 0; cell < this.flow.length; cell++) {
            const x = (cell % COLS) * NAV + 8, y = Math.floor(cell / COLS) * NAV + 8
            if (this.flow[cell] > 10 && !this.blockedAt(x, y, 14)) { point = { x, y }; break }
          }
        }
      }
      const kind: EnemyKind = this.wave === 5 && i === 0 ? 'brute' : this.wave >= 3 && i % 5 === 0 ? 'gunner' : this.wave >= 2 && i % 3 === 0 ? 'runner' : 'lurker'
      const health = kind === 'brute' ? 260 : kind === 'gunner' ? 70 : kind === 'runner' ? 40 : 54
      this.enemies.push({ ...point, id: this.nextId++, kind, health, maxHealth: health,
        speed: (kind === 'brute' ? 32 : kind === 'runner' ? 76 : kind === 'gunner' ? 36 : 43) + this.wave * 2,
        radius: kind === 'brute' ? 13 : 8, angle: 0, walk: i, hit: 0, attack: 0.5 + Math.random(), alive: true })
    }
  }

  private autoAim() {
    let best: Enemy | undefined, nearest = Infinity
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue
      const d = distance(this.player, enemy)
      if (d < nearest && this.lineOfSight(this.player, enemy)) { nearest = d; best = enemy }
    }
    if (best) this.player.angle = Math.atan2(best.y - this.player.y, best.x - this.player.x)
  }

  private fire() {
    const p = this.player, gun = WEAPONS[p.activeWeapon], status = this.weapons[p.activeWeapon]
    if (p.reloadTimer > 0 || p.shootTimer > 0 || p.dashTime > 0) return
    if (status.ammo <= 0) { this.reload(); return }
    status.ammo--; p.shootTimer = gun.interval; p.muzzle = 0.055
    const x = p.x + Math.cos(p.angle) * 18, y = p.y + Math.sin(p.angle) * 18
    for (let i = 0; i < gun.pellets; i++) {
      const angle = p.angle + (Math.random() * 2 - 1) * gun.spread
      this.bullets.push({ x, y, vx: Math.cos(angle) * gun.speed, vy: Math.sin(angle) * gun.speed,
        damage: gun.damage, life: gun.id === 'shotgun' ? 0.5 : 1.1, enemy: false, color: gun.color })
    }
    this.shake = Math.max(this.shake, gun.id === 'shotgun' ? 2.5 : 0.7)
    this.audio.fire(gun.id)
    this.burst(x, y, 3, '#ffc487', 40)
  }

  private updatePlayer(dt: number) {
    const p = this.player
    p.invincible = Math.max(0, p.invincible - dt)
    p.dashCooldown = Math.max(0, p.dashCooldown - dt)
    p.muzzle = Math.max(0, p.muzzle - dt)
    p.shootTimer = Math.max(0, p.shootTimer - dt)
    if (this.touchFire || this.keys.has('KeyJ')) this.autoAim()
    else if (this.pointer.active) p.angle = Math.atan2(this.pointer.y + this.view.y - p.y, this.pointer.x + this.view.x - p.x)
    const move = this.movement(), length = Math.hypot(move.x, move.y)
    p.moving = length > 0.05
    if (p.dashTime > 0) {
      p.dashTime = Math.max(0, p.dashTime - dt)
      this.move(p, p.dashX * 480 * dt, p.dashY * 480 * dt, 7)
      this.ghostTimer -= dt
      if (this.ghostTimer <= 0) {
        if (this.settings.particles) this.ghosts.push({ x: p.x, y: p.y, angle: p.angle, life: 0.25 })
        this.ghostTimer = 0.025
      }
    } else if (p.moving) {
      const sprinting = (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || Math.hypot(this.stick.x, this.stick.y) > 0.88) && p.stamina > 2
      const speed = sprinting ? 155 : 105
      const normalization = Math.max(1, length)
      this.move(p, move.x / normalization * speed * dt, move.y / normalization * speed * dt, 7)
      p.stamina = clamp(p.stamina + (sprinting ? -28 : 18) * dt, 0, 100)
      p.walk += dt
    } else p.stamina = Math.min(100, p.stamina + dt * 27)
    if (p.reloadTimer > 0) {
      p.reloadTimer -= dt
      if (p.reloadTimer <= 0) {
        p.reloadTimer = 0
        const gun = WEAPONS[p.activeWeapon], status = this.weapons[p.activeWeapon]
        const amount = status.reserve < 0 ? gun.capacity - status.ammo : Math.min(gun.capacity - status.ammo, status.reserve)
        status.ammo += amount
        if (status.reserve >= 0) status.reserve -= amount
        this.audio.reload()
      }
    }
    if (this.pointer.down || this.touchFire || this.keys.has('KeyJ')) this.fire()
    const loot = this.closestLoot()
    this.prompt = this.extractionOpen && distance(p, EXTRACTION) < 40 ? 'Extract from the outpost' : loot ? `Pick up ${lootLabel(loot.kind)}` : ''
  }

  private updateEnemies(dt: number) {
    for (const e of this.enemies) {
      if (!e.alive) continue
      e.hit = Math.max(0, e.hit - dt); e.attack = Math.max(0, e.attack - dt)
      const d = distance(e, this.player)
      e.angle = Math.atan2(this.player.y - e.y, this.player.x - e.x)
      let target = this.player as Point
      const clear = this.lineOfSight(e, this.player)
      if (!clear) {
        const gx = Math.floor(e.x / NAV), gy = Math.floor(e.y / NAV)
        let cost = Infinity, next: Point | null = null
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = gx + dx, ny = gy + dy
          if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue
          const value = this.flow[ny * COLS + nx]
          if (value >= 0 && value < cost) { cost = value; next = { x: nx * NAV + 8, y: ny * NAV + 8 } }
        }
        if (next) target = next
      }
      if (d > (e.kind === 'gunner' && clear ? 126 : 16)) {
        let mx = target.x - e.x, my = target.y - e.y
        const len = Math.hypot(mx, my) || 1
        mx /= len; my /= len
        // A little separation prevents enemies from collapsing into one sprite.
        for (const other of this.enemies) {
          if (!other.alive || other.id === e.id) continue
          const sep = distance(e, other)
          if (sep < 17 && sep > 0.1) { mx += (e.x - other.x) / sep * 0.55; my += (e.y - other.y) / sep * 0.55 }
        }
        const speed = e.hit > 0 ? e.speed * 0.25 : e.speed
        this.move(e, mx * speed * dt, my * speed * dt, e.radius)
        e.walk += dt
      }
      if (e.kind === 'gunner' && d < 260 && d > 32 && clear && e.attack <= 0) {
        const angle = e.angle + (Math.random() - 0.5) * 0.15
        this.bullets.push({ x: e.x + Math.cos(angle) * 15, y: e.y + Math.sin(angle) * 15,
          vx: Math.cos(angle) * 180, vy: Math.sin(angle) * 180, damage: 10, life: 2, enemy: true, color: '#eb775d' })
        e.attack = 1.6
      } else if (d < e.radius + 10 && e.attack <= 0) {
        this.hurtPlayer(e.kind === 'brute' ? 24 : 12); e.attack = 0.8
      }
      if (this.phase !== 'playing') break
    }
  }

  private killEnemy(e: Enemy) {
    if (!e.alive || this.phase !== 'playing') return
    e.alive = false; this.kills++; this.waveKills++; this.score += e.kind === 'brute' ? 500 : 125
    this.corpses.push({ x: e.x, y: e.y, angle: e.angle, kind: e.kind, time: this.time })
    if (this.corpses.length > 75) this.corpses.shift()
    this.burst(e.x, e.y, 10, '#ac7953', 40)
    if (Math.random() < 0.16) this.world.loot.push({ id: this.nextId++, x: e.x, y: e.y, kind: Math.random() > 0.35 ? 'ammo' : 'medkit', active: true })
  }

  private hurtPlayer(damage: number) {
    const p = this.player
    if (p.invincible > 0 || p.dashTime > 0 || this.phase !== 'playing') return
    p.health = Math.max(0, p.health - damage); p.invincible = 0.65
    this.damageFlash = 0.22; this.shake = 5; this.audio.hit(); this.burst(p.x, p.y, 8, '#d48659', 50)
    if (p.health === 0) this.finish(false)
  }

  private damageProp(prop: Prop, damage: number) {
    prop.health -= damage
    this.burst(prop.x, prop.y, 3, '#a99b6d', 30)
    if (prop.health > 0) return
    prop.active = false
    this.buildNavigation(); this.computeFlow()
    if (prop.kind === 'barrel') {
      this.shake = 8; this.audio.explode(); this.burst(prop.x, prop.y, 55, '#ffc47c', 120)
      this.burst(prop.x, prop.y, 20, '#cc7750', 80)
      for (const enemy of this.enemies) {
        if (enemy.alive && distance(enemy, prop) < 68) {
          enemy.health -= 140; enemy.hit = 0.15
          if (enemy.health <= 0) this.killEnemy(enemy)
        }
      }
      if (distance(this.player, prop) < 56) this.hurtPlayer(28)
      for (const other of this.world.props) {
        if (other.active && other.kind === 'barrel' && distance(other, prop) < 52) this.damageProp(other, 100)
      }
    } else {
      this.burst(prop.x, prop.y, 20, '#ab9560', 60)
      this.world.loot.push({ id: this.nextId++, x: prop.x, y: prop.y, kind: Math.random() > 0.35 ? 'ammo' : 'medkit', active: true })
    }
  }

  private updateBullets(dt: number) {
    for (const b of this.bullets) {
      if (this.phase !== 'playing') break
      b.life -= dt
      if (b.life <= 0) continue
      const steps = Math.ceil(Math.hypot(b.vx, b.vy) * dt / 4)
      for (let step = 0; step < steps; step++) {
        b.x += b.vx * dt / steps; b.y += b.vy * dt / steps
        if (this.blockedAt(b.x, b.y, 1.5, false)) { b.life = 0; this.burst(b.x, b.y, 3, '#c6c59e', 24); break }
        const prop = this.world.props.find((p) => p.active && distance(p, b) < (p.kind === 'crate' ? 12 : 8))
        if (prop) { this.damageProp(prop, b.damage); b.life = 0; break }
        if (b.enemy) {
          if (distance(b, this.player) < 9) { this.hurtPlayer(b.damage); b.life = 0; break }
        } else {
          const enemy = this.enemies.find((e) => e.alive && distance(e, b) < e.radius + 2)
          if (enemy) {
            enemy.health -= b.damage; enemy.hit = 0.12; b.life = 0
            this.move(enemy, b.vx / 80, b.vy / 80, enemy.radius)
            this.burst(b.x, b.y, 4, '#dfac74', 35)
            if (enemy.health <= 0) this.killEnemy(enemy)
            break
          }
        }
      }
    }
    this.bullets = this.bullets.filter((b) => b.life > 0)
  }

  private updateWaves(dt: number) {
    if (this.extractionOpen) return
    if (this.waveBreak > 0) {
      this.waveBreak -= dt
      if (this.waveBreak <= 0) {
        this.waveBreak = 0; this.wave++; this.computeFlow(); this.spawnWave()
        this.showNotice(`WAVE ${String(this.wave).padStart(2, '0')} / ${this.wave === 5 ? 'THE LAST STAND' : 'HOSTILES INBOUND'}`, 3)
        this.audio.wave()
      }
    } else if (!this.enemies.some((e) => e.alive)) {
      this.score += 250
      if (this.wave === 5) {
        this.extractionOpen = true; this.showNotice('OUTPOST CLEARED / REACH THE EXTRACTION BEACON', 8); this.audio.wave()
      } else {
        this.waveBreak = 4
        this.showNotice('WAVE CLEARED / RESUPPLY AND CATCH YOUR BREATH', 3)
        this.addAmmo()
        this.player.health = Math.min(100, this.player.health + 15)
        this.audio.pickup()
      }
    }
  }

  private finish(extracted: boolean) {
    if (this.recorded) return
    this.recorded = true; this.phase = extracted ? 'extracted' : 'dead'
    if (extracted) { this.score += 2000; this.audio.wave() } else this.audio.death()
    this.clearInput(); this.prompt = ''; this.notice = ''
    this.onFinish({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, score: this.currentScore(), kills: this.kills,
      wave: this.wave, seconds: Math.floor(this.seconds), extracted, date: new Date().toISOString() })
    this.publish()
  }

  private currentScore() { return this.score + Math.floor(this.seconds * 2) }
  private showNotice(text: string, duration = 2.5) { this.notice = text; this.noticeTime = duration }

  private burst(x: number, y: number, count: number, color: string, speed: number) {
    if (!this.settings.particles) return
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2, power = speed * (0.25 + Math.random() * 0.75), life = 0.2 + Math.random() * 0.5
      this.particles.push({ x, y, vx: Math.cos(angle) * power, vy: Math.sin(angle) * power, life, maxLife: life, color, size: Math.random() > 0.8 ? 3 : 1 })
    }
    if (this.particles.length > 350) this.particles.splice(0, this.particles.length - 350)
  }

  private centerCamera(immediate = false, dt = 0.016) {
    const x = clamp(this.player.x - (this.phase === 'ready' ? 74 : 0) - this.width / 2, 0, Math.max(0, WORLD_W - this.width))
    const y = clamp(this.player.y - 18 - this.height / 2, 0, Math.max(0, WORLD_H - this.height))
    const t = immediate ? 1 : 1 - Math.exp(-9 * dt)
    this.camera.x = lerp(this.camera.x, x, t); this.camera.y = lerp(this.camera.y, y, t)
    this.view.x = Math.round(this.camera.x + (this.settings.shake ? (Math.random() - 0.5) * this.shake : 0))
    this.view.y = Math.round(this.camera.y + (this.settings.shake ? (Math.random() - 0.5) * this.shake : 0))
  }

  private loop = (now: number) => {
    if (this.disposed) return
    const dt = this.lastFrame ? Math.min((now - this.lastFrame) / 1000, 0.033) : 0.016
    this.lastFrame = now
    if (this.phase !== 'paused') {
      this.time += dt
      if (this.phase === 'playing') {
        this.seconds += dt
        this.navTimer -= dt
        if (this.navTimer <= 0) { this.computeFlow(); this.navTimer = 0.35 }
        this.updatePlayer(dt)
        this.updateEnemies(dt)
        if (this.phase === 'playing') this.updateBullets(dt)
        if (this.phase === 'playing') this.updateWaves(dt)
      }
      this.noticeTime = Math.max(0, this.noticeTime - dt)
      if (this.noticeTime === 0) this.notice = ''
      this.shake = Math.max(0, this.shake - dt * 25)
      this.damageFlash = Math.max(0, this.damageFlash - dt)
      for (const p of this.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - dt * 4; p.vy *= 1 - dt * 4; p.life -= dt }
      this.particles = this.particles.filter((p) => p.life > 0)
      for (const ghost of this.ghosts) ghost.life -= dt
      this.ghosts = this.ghosts.filter((g) => g.life > 0)
      this.centerCamera(false, dt)
    }
    this.render()
    this.hudTimer += dt
    if (this.hudTimer > 0.1) { this.hudTimer = 0; this.publish() }
    this.frame = requestAnimationFrame(this.loop)
  }

  private render() {
    const c = this.c, p = this.player
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.fillStyle = '#1b2720'; c.fillRect(0, 0, this.width, this.height)
    c.save(); c.translate(-this.view.x, -this.view.y)
    c.drawImage(this.world.terrain, 0, 0)
    drawBeacon(c, EXTRACTION.x, EXTRACTION.y, this.time, this.extractionOpen)
    for (const corpse of this.corpses) {
      c.save(); c.translate(Math.round(corpse.x), Math.round(corpse.y)); c.rotate(corpse.angle)
      c.fillStyle = '#403b2b'; c.fillRect(-9, -5, 19, 8)
      c.fillStyle = '#63634b'; c.fillRect(-5, -3, 9, 5)
      c.fillStyle = '#7c7e59'; c.fillRect(6, -3, 5, 5)
      c.fillStyle = '#94624288'; c.fillRect(-10, -6, 5, 4); c.restore()
    }
    for (const item of this.world.loot) drawLoot(c, item, this.time)
    for (const ghost of this.ghosts) {
      c.save(); c.globalAlpha = ghost.life / 0.25 * 0.7
      drawPlayer(c, { ...ghost, walk: p.walk, moving: true, hit: 0, dash: 1, flash: 0, weapon: WEAPONS[p.activeWeapon].id }, true)
      c.restore()
    }
    const actors: { y: number; draw: () => void }[] = []
    for (const prop of this.world.props) if (prop.active) actors.push({ y: prop.y, draw: () => drawProp(c, prop) })
    for (const enemy of this.enemies) if (enemy.alive) actors.push({ y: enemy.y, draw: () => drawEnemy(c, enemy) })
    if (this.phase !== 'dead') actors.push({ y: p.y, draw: () => drawPlayer(c, { x: p.x, y: p.y, angle: p.angle, walk: p.walk,
      moving: p.moving, hit: p.invincible, dash: p.dashTime, flash: p.muzzle, weapon: WEAPONS[p.activeWeapon].id }) })
    actors.sort((a, b) => a.y - b.y)
    actors.forEach((actor) => actor.draw())
    for (const bullet of this.bullets) {
      c.strokeStyle = `${bullet.color}80`; c.lineWidth = 1
      c.beginPath(); c.moveTo(bullet.x, bullet.y); c.lineTo(bullet.x - bullet.vx * 0.013, bullet.y - bullet.vy * 0.013); c.stroke()
      c.fillStyle = bullet.color; c.fillRect(Math.round(bullet.x) - 1, Math.round(bullet.y) - 1, 2, 2)
    }
    for (const particle of this.particles) {
      c.globalAlpha = particle.life / particle.maxLife; c.fillStyle = particle.color
      c.fillRect(Math.round(particle.x), Math.round(particle.y), particle.size, particle.size)
    }
    c.globalAlpha = 1
    if (p.muzzle > 0) light(c, p.x, p.y, 40, '#ffae6b')
    // Slowly drifting leaves and broad light shafts give the static world some life.
    if (this.settings.particles) {
      for (let i = 0; i < 24; i++) {
        const x = this.view.x + ((i * 79 + this.time * 3) % this.width)
        const y = this.view.y + ((i * 43 + this.time * 1.4 + Math.sin(this.time + i) * 3) % this.height)
        c.fillStyle = i % 4 === 0 ? '#d5b37266' : '#90a16a55'; c.fillRect(Math.round(x), Math.round(y), 1, 1)
      }
    }
    c.fillStyle = '#efcc8320'
    c.beginPath(); c.moveTo(675, 190); c.lineTo(767, 190); c.lineTo(1041, 659); c.lineTo(997, 659); c.closePath(); c.fill()
    c.fillStyle = '#efcc8310'
    c.beginPath(); c.moveTo(489, 219); c.lineTo(519, 219); c.lineTo(873, 809); c.lineTo(811, 809); c.closePath(); c.fill()
    if (this.extractionOpen) {
      c.fillStyle = '#dce9c1'; c.textAlign = 'center'; c.font = '6px monospace'
      c.fillText('EXTRACTION', EXTRACTION.x, EXTRACTION.y - 29)
      const dx = EXTRACTION.x - p.x, dy = EXTRACTION.y - p.y
      if (Math.abs(dx) > this.width / 2 - 40 || Math.abs(dy) > this.height / 2 - 40) {
        const angle = Math.atan2(dy, dx)
        const x = p.x + Math.cos(angle) * Math.min(this.width, this.height) * 0.36
        const y = p.y + Math.sin(angle) * Math.min(this.width, this.height) * 0.36
        c.save(); c.translate(x, y); c.rotate(angle); c.beginPath(); c.moveTo(7, 0); c.lineTo(-4, -4); c.lineTo(-4, 4); c.closePath(); c.fill(); c.restore()
      }
    }
    c.restore()
    const vignette = c.createRadialGradient(this.width / 2, this.height / 2, this.height * 0.15, this.width / 2, this.height / 2, this.width * 0.63)
    vignette.addColorStop(0, '#0c160e00'); vignette.addColorStop(1, '#0b130ba6')
    c.fillStyle = vignette; c.fillRect(0, 0, this.width, this.height)
    if (this.damageFlash > 0) { c.fillStyle = `rgba(182, 67, 44, ${this.damageFlash * 0.5})`; c.fillRect(0, 0, this.width, this.height) }
    if (this.phase === 'playing' && this.pointer.active && !this.touchFire) {
      const x = Math.round(this.pointer.x), y = Math.round(this.pointer.y)
      c.fillStyle = '#e7dfc2'; c.fillRect(x - 6, y, 4, 1); c.fillRect(x + 3, y, 4, 1); c.fillRect(x, y - 6, 1, 4); c.fillRect(x, y + 3, 1, 4)
      c.fillStyle = '#fbad69'; c.fillRect(x, y, 1, 1)
    }
  }

  private publish() {
    if (this.disposed) return
    const p = this.player
    this.onSnapshot({ phase: this.phase, health: Math.ceil(p.health), stamina: Math.round(p.stamina), dash: 1 - p.dashCooldown / 1.2,
      wave: this.wave, waveKills: this.waveKills, waveTotal: WAVE_COUNTS[this.wave - 1], enemies: this.enemies.filter((e) => e.alive).length,
      kills: this.kills, score: this.currentScore(), seconds: Math.floor(this.seconds), activeWeapon: p.activeWeapon,
      weapons: this.weapons.map((w) => ({ ...w })), reload: p.reloadTimer > 0 ? Math.max(0.01, 1 - p.reloadTimer / p.reloadTotal) : 0,
      prompt: this.prompt, notice: this.notice, waveBreak: Math.ceil(this.waveBreak), extractionOpen: this.extractionOpen,
      player: { x: p.x, y: p.y }, enemyPositions: this.enemies.filter((e) => e.alive).map((e) => ({ x: e.x, y: e.y })),
      lootPositions: this.world.loot.filter((l) => l.active).map((l) => ({ x: l.x, y: l.y })) })
  }

  dispose() { this.disposed = true; cancelAnimationFrame(this.frame); this.clearInput(); this.audio.dispose() }
}