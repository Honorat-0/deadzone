import type { EnemyKind, Loot, Prop, WeaponId } from './types'

export function light(c: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
  const gradient = c.createRadialGradient(x, y, 0, x, y, radius)
  gradient.addColorStop(0, `${color}38`)
  gradient.addColorStop(1, `${color}00`)
  c.fillStyle = gradient
  c.fillRect(x - radius, y - radius, radius * 2, radius * 2)
}

export function drawGun(c: CanvasRenderingContext2D, kind: WeaponId, x: number, y: number, angle = 0) {
  c.save(); c.translate(Math.round(x), Math.round(y)); c.rotate(angle)
  if (kind === 'shotgun') {
    c.fillStyle = '#574633'; c.fillRect(-5, -2, 7, 5)
    c.fillStyle = '#aaafa0'; c.fillRect(0, -3, 13, 2); c.fillRect(0, 0, 13, 2)
    c.fillStyle = '#252e29'; c.fillRect(10, -3, 4, 2); c.fillRect(10, 0, 4, 2)
    c.fillStyle = '#f5c283'; c.fillRect(1, -2, 4, 1)
  } else if (kind === 'smg') {
    c.fillStyle = '#303e38'; c.fillRect(-4, -3, 12, 5); c.fillRect(-3, 1, 3, 5)
    c.fillStyle = '#bbc0a6'; c.fillRect(-3, -3, 11, 2); c.fillRect(8, -2, 6, 2)
    c.fillStyle = '#748875'; c.fillRect(3, 2, 3, 5)
  } else {
    c.fillStyle = '#d0d1bb'; c.fillRect(0, -3, 11, 4)
    c.fillStyle = '#40483c'; c.fillRect(0, 1, 4, 5); c.fillRect(8, -1, 4, 2)
    c.fillStyle = '#f2e4bd'; c.fillRect(1, -3, 7, 1)
  }
  c.restore()
}

interface HumanArt {
  x: number; y: number; angle: number; walk: number
  moving: boolean; hit: number; dash: number; flash: number; weapon: WeaponId
}

export function drawPlayer(c: CanvasRenderingContext2D, p: HumanArt, ghost = false) {
  c.save(); c.translate(Math.round(p.x), Math.round(p.y))
  if (ghost) c.globalAlpha *= 0.3
  if (p.hit > 0 && Math.floor(p.hit * 30) % 2 === 0) c.globalAlpha *= 0.4
  c.fillStyle = '#101c1990'; c.fillRect(-7, 6, 16, 4); c.fillRect(-9, 7, 20, 2)
  const step = p.moving ? Math.round(Math.sin(p.walk * 14) * 2) : 0
  c.fillStyle = '#262f2d'; c.fillRect(-5, 4 + step, 4, 7); c.fillRect(2, 4 - step, 4, 7)
  c.fillStyle = '#969d85'; c.fillRect(-5, 5 + step, 3, 3); c.fillRect(3, 5 - step, 3, 3)
  c.fillStyle = '#171f1d'; c.fillRect(-6, 10 + step, 5, 2); c.fillRect(2, 10 - step, 5, 2)
  c.fillStyle = '#333e36'; c.fillRect(-6, -5, 12, 11)
  c.fillStyle = '#a9b39b'; c.fillRect(-5, -5, 10, 7)
  c.fillStyle = '#798a77'; c.fillRect(-5, -1, 10, 5)
  c.fillStyle = '#39473c'; c.fillRect(-3, -5, 6, 9)
  c.fillStyle = '#bac5a7'; c.fillRect(-2, -4, 4, 2)
  c.fillStyle = '#e98448'; c.fillRect(-7, -4, 3, 5)
  c.fillStyle = '#889982'; c.fillRect(5, -4, 3, 6)
  c.fillStyle = '#bdc5b0'; c.fillRect(-5, -12, 10, 7)
  c.fillStyle = '#e8e6c9'; c.fillRect(-4, -13, 8, 3); c.fillRect(-5, -11, 2, 2)
  c.fillStyle = '#526358'; c.fillRect(-4, -7, 8, 3)
  c.fillStyle = '#f9c981'; c.fillRect(p.angle > -Math.PI / 2 && p.angle < Math.PI / 2 ? 2 : -3, -8, 2, 1)
  drawGun(c, p.weapon, Math.cos(p.angle) * 7, Math.sin(p.angle) * 5, p.angle)
  if (p.flash > 0) {
    c.save(); c.rotate(p.angle)
    c.fillStyle = '#ffc06d'; c.fillRect(17, -3, 8, 5); c.fillRect(20, -5, 3, 9)
    c.fillStyle = '#fff4ca'; c.fillRect(17, -1, 6, 2)
    c.restore()
  }
  if (p.dash > 0) {
    c.strokeStyle = '#d9e0ae88'; c.lineWidth = 1
    c.strokeRect(-10, -15, 20, 29)
  }
  c.restore()
}

interface EnemyArt {
  x: number; y: number; kind: EnemyKind; angle: number; walk: number; hit: number; health: number; maxHealth: number
}

export function drawEnemy(c: CanvasRenderingContext2D, e: EnemyArt) {
  c.save(); c.translate(Math.round(e.x), Math.round(e.y))
  if (e.kind === 'brute') c.scale(1.55, 1.55)
  const step = Math.round(Math.sin(e.walk * 9) * 2)
  c.fillStyle = '#14201aa0'; c.fillRect(-8, 5, 19, 5)
  c.fillStyle = '#383b31'; c.fillRect(-5, 4 + step, 4, 7); c.fillRect(2, 4 - step, 4, 7)
  c.fillStyle = '#626348'; c.fillRect(-5, 7 + step, 3, 2); c.fillRect(3, 6 - step, 3, 3)
  const jacket = e.kind === 'gunner' ? '#754a3d' : e.kind === 'runner' ? '#8d765a' : e.kind === 'brute' ? '#685849' : '#626552'
  c.fillStyle = e.hit > 0 ? '#e5b88b' : jacket
  c.fillRect(-6, -5, 12, 11); c.fillRect(-8, -3 + step, 3, 7); c.fillRect(6, -2 - step, 3, 7)
  c.fillStyle = '#363e30'; c.fillRect(-3, -4, 3, 9)
  c.fillStyle = '#a4a178'; c.fillRect(-4, -11, 8, 7); c.fillRect(-6, 2 + step, 2, 3); c.fillRect(6, 3 - step, 2, 3)
  c.fillStyle = '#747f59'; c.fillRect(-5, -12, 10, 3); c.fillRect(-5, -9, 2, 3)
  c.fillStyle = '#394437'; c.fillRect(-4, -6, 8, 2)
  c.fillStyle = '#ff7c5b'; c.fillRect(-3, -8, 2, 1); c.fillRect(2, -8, 2, 1)
  if (e.kind === 'gunner') drawGun(c, 'pistol', Math.cos(e.angle) * 7, Math.sin(e.angle) * 4, e.angle)
  if (e.kind === 'brute') {
    c.fillStyle = '#98866a'; c.fillRect(-8, -6, 4, 5); c.fillRect(5, -6, 4, 5)
  }
  if (e.health < e.maxHealth) {
    c.fillStyle = '#141c16'; c.fillRect(-10, -18, 20, 3)
    c.fillStyle = '#db7753'; c.fillRect(-9, -17, Math.max(0, 18 * e.health / e.maxHealth), 1)
  }
  c.restore()
}

export function drawProp(c: CanvasRenderingContext2D, p: Prop) {
  if (!p.active) return
  const x = Math.round(p.x), y = Math.round(p.y)
  c.fillStyle = '#1c261e99'; c.fillRect(x - 6, y + 4, 20, 9)
  if (p.kind === 'barrel') {
    c.fillStyle = '#373f30'; c.fillRect(x - 7, y - 8, 14, 18)
    c.fillStyle = '#7f7860'; c.fillRect(x - 6, y - 7, 12, 16)
    c.fillStyle = '#a19675'; c.fillRect(x - 5, y - 8, 10, 3)
    c.fillStyle = '#484d3c'; c.fillRect(x - 7, y - 2, 14, 2); c.fillRect(x - 7, y + 5, 14, 2)
    c.fillStyle = '#c7834c'; c.fillRect(x - 5, y, 10, 4)
    c.fillStyle = '#393a2e'; c.fillRect(x - 2, y, 3, 4)
    c.fillStyle = '#b8ae83'; c.fillRect(x - 4, y - 5, 2, 2)
  } else {
    c.fillStyle = '#292d22'; c.fillRect(x - 11, y - 10, 23, 23)
    c.fillStyle = '#766b48'; c.fillRect(x - 10, y - 11, 22, 22)
    c.fillStyle = '#9c8d5e'; c.fillRect(x - 10, y - 11, 22, 3); c.fillRect(x - 10, y - 11, 3, 22)
    c.fillStyle = '#4b4934'; c.fillRect(x - 6, y - 6, 14, 13)
    c.strokeStyle = '#8d7e51'; c.lineWidth = 2
    c.beginPath(); c.moveTo(x - 6, y - 6); c.lineTo(x + 8, y + 7); c.moveTo(x + 8, y - 6); c.lineTo(x - 6, y + 7); c.stroke()
    c.fillStyle = '#aaa075'; c.fillRect(x - 9, y - 9, 2, 2); c.fillRect(x + 9, y + 8, 2, 2)
  }
}

export const lootLabel = (kind: Loot['kind']) => ({
  pistol: 'P9 Sidearm', shotgun: 'Sawed-off', smg: 'VX-9 SMG', ammo: 'Ammo supply', medkit: 'Medkit +35 HP', cache: 'Supply cache',
})[kind]

export function drawLoot(c: CanvasRenderingContext2D, item: Loot, time: number) {
  if (!item.active) return
  const x = Math.round(item.x), y = Math.round(item.y)
  const color = item.kind === 'medkit' ? '#a2c08c' : '#f4ae63'
  light(c, x, y, 25 + Math.sin(time * 3) * 3, color)
  c.fillStyle = '#131e18bb'; c.fillRect(x - 11, y + 4, 25, 6)
  c.save(); c.translate(x, y + Math.round(Math.sin(time * 3 + item.id) * 1.5))
  if (item.kind === 'medkit') {
    c.fillStyle = '#9fac89'; c.fillRect(-7, -5, 14, 11)
    c.fillStyle = '#d3d6b1'; c.fillRect(-6, -6, 12, 3)
    c.fillStyle = '#e87b4d'; c.fillRect(-1, -3, 3, 7); c.fillRect(-3, -1, 7, 3)
  } else if (item.kind === 'ammo' || item.kind === 'cache') {
    c.fillStyle = '#68725b'; c.fillRect(-9, -6, 18, 13)
    c.fillStyle = '#899476'; c.fillRect(-9, -7, 18, 3)
    c.fillStyle = '#323f31'; c.fillRect(-9, -1, 18, 2)
    c.fillStyle = '#eab56b'; c.fillRect(-3, -3, 6, 6)
    c.fillStyle = '#706043'; c.fillRect(-1, -2, 2, 4)
  } else {
    c.fillStyle = '#25352ce0'; c.fillRect(-15, -8, 30, 15)
    c.strokeStyle = '#d0a668'; c.lineWidth = 1; c.strokeRect(-15, -8, 30, 15)
    drawGun(c, item.kind, -2, 0)
  }
  c.strokeStyle = `${color}b0`; c.lineWidth = 1
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    c.beginPath(); c.moveTo(sx * 17, sy * 6); c.lineTo(sx * 17, sy * 11); c.lineTo(sx * 12, sy * 11); c.stroke()
  }
  c.restore()
}

export function drawBeacon(c: CanvasRenderingContext2D, x: number, y: number, time: number, open: boolean) {
  const color = open ? '#bfddad' : '#6d8875'
  c.strokeStyle = `${color}90`; c.lineWidth = 1
  c.strokeRect(x - 21, y - 21, 42, 42)
  for (let i = 0; i < 4; i++) {
    const angle = Math.PI / 4 + i * Math.PI / 2
    const px = x + Math.cos(angle) * 24, py = y + Math.sin(angle) * 24
    c.fillStyle = '#404e3d'; c.fillRect(px - 2, py - 2, 5, 5)
    c.fillStyle = open ? '#e5f7c4' : '#849d75'; c.fillRect(px - 1, py - 1, 3, 2)
  }
  if (open) {
    light(c, x, y, 65, '#bbdca5')
    c.globalAlpha = 1 - (time % 1.8) / 1.8
    c.strokeStyle = '#dce8b1'
    c.beginPath(); c.arc(x, y, 14 + (time % 1.8) * 14, 0, Math.PI * 2); c.stroke()
    c.globalAlpha = 1
    c.fillStyle = '#e0e9b9'; c.fillRect(x - 1, y - 7, 3, 15); c.fillRect(x - 7, y - 1, 15, 3)
  }
}