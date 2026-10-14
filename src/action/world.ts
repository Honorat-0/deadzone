import type { Loot, Prop, Rect, Solid } from './types'

export const WORLD_W = 1280
export const WORLD_H = 896
export const SPAWN = { x: 640, y: 496 }
export const EXTRACTION = { x: 640, y: 288 }
export const TRUCK = { x: 836, y: 513, w: 69, h: 28 }

export function seededRandom(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

export const WALLS: Rect[] = [
  { x: 16, y: 16, w: 1248, h: 10 }, { x: 16, y: 870, w: 1248, h: 10 },
  { x: 16, y: 16, w: 10, h: 864 }, { x: 1254, y: 16, w: 10, h: 864 },
  { x: 336, y: 208, w: 192, h: 9 }, { x: 336, y: 208, w: 9, h: 112 },
  { x: 519, y: 208, w: 9, h: 56 }, { x: 336, y: 311, w: 72, h: 9 },
  { x: 455, y: 311, w: 73, h: 9 },
  { x: 816, y: 288, w: 9, h: 56 }, { x: 816, y: 288, w: 144, h: 9 },
  { x: 951, y: 288, w: 9, h: 112 }, { x: 816, y: 391, w: 52, h: 9 },
  { x: 915, y: 391, w: 45, h: 9 },
  { x: 368, y: 608, w: 176, h: 9 }, { x: 368, y: 608, w: 9, h: 104 },
  { x: 368, y: 703, w: 176, h: 9 }, { x: 535, y: 656, w: 9, h: 56 },
  { x: 704, y: 128, w: 176, h: 9 }, { x: 704, y: 128, w: 9, h: 96 },
  { x: 871, y: 128, w: 9, h: 96 }, { x: 704, y: 215, w: 54, h: 9 },
  { x: 807, y: 215, w: 73, h: 9 },
  { x: 176, y: 464, w: 104, h: 8 }, { x: 272, y: 464, w: 8, h: 72 },
  { x: 992, y: 576, w: 8, h: 96 }, { x: 992, y: 664, w: 112, h: 8 },
]

const TREE_POINTS = [
  [125, 130], [181, 168], [245, 90], [297, 190], [374, 113], [530, 133],
  [597, 92], [937, 130], [1028, 227], [1101, 147], [1183, 303], [1097, 377],
  [300, 370], [337, 413], [263, 604], [177, 644], [337, 758], [554, 768],
  [730, 742], [877, 687], [1126, 744], [1150, 516], [92, 392], [91, 770],
  [1012, 782], [474, 794], [808, 821], [422, 376], [814, 600], [986, 463],
]

export const MINIMAP_SOLIDS: Solid[] = [
  ...WALLS.map((r) => ({ ...r, kind: 'wall' as const })),
  ...TREE_POINTS.map(([x, y]) => ({ x: x - 7, y: y - 5, w: 14, h: 15, kind: 'tree' as const })),
  { ...TRUCK, kind: 'rock' },
]

export interface World {
  terrain: HTMLCanvasElement
  solids: Solid[]
  props: Prop[]
  loot: Loot[]
}

function inside(p: { x: number; y: number }, r: Rect, margin = 0) {
  return p.x > r.x - margin && p.x < r.x + r.w + margin && p.y > r.y - margin && p.y < r.y + r.h + margin
}

export function createWorld(): World {
  const terrain = document.createElement('canvas')
  terrain.width = WORLD_W
  terrain.height = WORLD_H
  const c = terrain.getContext('2d')!
  c.imageSmoothingEnabled = false
  const rnd = seededRandom(74209)
  const ground = ['#27352b', '#29372c', '#2b382d', '#28382e', '#2b382c']
  const grass = ['#45503a', '#384831', '#4d563c', '#34422f', '#64704b']

  for (let y = 0; y < WORLD_H; y += 16) {
    for (let x = 0; x < WORLD_W; x += 16) {
      c.fillStyle = ground[Math.floor(rnd() * ground.length)]
      c.fillRect(x, y, 16, 16)
      for (let n = 0; n < 6; n++) {
        c.fillStyle = grass[Math.floor(rnd() * grass.length)]
        c.fillRect(x + Math.floor(rnd() * 15), y + Math.floor(rnd() * 15), rnd() > 0.8 ? 2 : 1, rnd() > 0.7 ? 3 : 1)
      }
    }
  }

  const paths: Rect[] = [
    { x: 580, y: 32, w: 118, h: 832 }, { x: 64, y: 448, w: 1152, h: 108 },
    { x: 390, y: 320, w: 447, h: 297 }, { x: 751, y: 222, w: 116, h: 128 },
  ]
  for (const r of paths) {
    c.fillStyle = '#41453a'
    c.fillRect(r.x, r.y, r.w, r.h)
    for (let n = 0; n < r.w * r.h / 15; n++) {
      const x = Math.floor(r.x + rnd() * r.w)
      const y = Math.floor(r.y + rnd() * r.h)
      c.fillStyle = ['#4d5142', '#565847', '#363f35', '#61634d'][Math.floor(rnd() * 4)]
      c.fillRect(x, y, rnd() > 0.85 ? 3 : 1, 1)
    }
    for (let n = 0; n < r.w / 3; n++) {
      const x = r.x + rnd() * r.w
      const y = rnd() > 0.5 ? r.y : r.y + r.h - 4
      c.fillStyle = '#4a573b'
      c.fillRect(Math.floor(x), Math.floor(y), 2, 4)
    }
  }

  const floors: Rect[] = [
    { x: 345, y: 217, w: 174, h: 94 }, { x: 825, y: 297, w: 126, h: 94 },
    { x: 377, y: 617, w: 158, h: 86 }, { x: 713, y: 137, w: 158, h: 78 },
    { x: 544, y: 357, w: 192, h: 160 },
  ]
  for (const r of floors) {
    c.fillStyle = '#181e1b'
    c.fillRect(r.x - 2, r.y + 3, r.w + 5, r.h + 3)
    for (let y = r.y; y < r.y + r.h; y += 16) {
      for (let x = r.x; x < r.x + r.w; x += 16) {
        c.fillStyle = ['#595d4c', '#555b4b', '#626453', '#575e4e'][Math.floor(rnd() * 4)]
        c.fillRect(x, y, Math.min(15, r.x + r.w - x), Math.min(15, r.y + r.h - y))
        c.fillStyle = '#6a6d59'
        c.fillRect(x, y, 13, 1)
        if (rnd() > 0.4) {
          c.fillStyle = '#454e3e'
          const cx = x + 4 + Math.floor(rnd() * 6)
          c.fillRect(cx, y + 6, 1, 6)
          c.fillRect(cx, y + 9, 4, 1)
        }
        if (rnd() > 0.65) {
          c.fillStyle = '#3c4d35'
          c.fillRect(x + 1, y + 12, 4, 3)
          c.fillStyle = '#526143'
          c.fillRect(x + 2, y + 13, 2, 1)
        }
      }
    }
  }

  // Broken road markings and an old landing pad make the arena easy to read.
  c.globalAlpha = 0.32
  c.fillStyle = '#cfbd7d'
  for (let y = 40; y < 860; y += 48) c.fillRect(636, y, 4, 20)
  for (let x = 88; x < 1190; x += 56) c.fillRect(x, 501, 25, 3)
  c.strokeStyle = '#c0baa1'
  c.lineWidth = 2
  c.strokeRect(565, 374, 149, 125)
  c.strokeRect(571, 380, 137, 113)
  c.font = 'bold 38px monospace'
  c.textAlign = 'center'
  c.fillText('07', 640, 448)
  c.globalAlpha = 1

  for (const r of WALLS) {
    c.fillStyle = '#1a231e'
    c.fillRect(r.x + 3, r.y + 6, r.w + 2, r.h + 3)
    c.fillStyle = '#3c453b'
    c.fillRect(r.x, r.y, r.w, r.h)
    c.fillStyle = '#89907b'
    c.fillRect(r.x, r.y, r.w, 2)
    c.fillStyle = '#606955'
    c.fillRect(r.x, r.y + 2, r.w, Math.max(2, r.h - 4))
    for (let x = r.x + 3; x < r.x + r.w - 2; x += 12) {
      c.fillStyle = '#434e41'
      c.fillRect(x, r.y + 2, 1, r.h - 2)
      c.fillStyle = '#768168'
      c.fillRect(x + 2, r.y + 3, Math.min(7, r.x + r.w - x - 2), 2)
    }
    for (let y = r.y + 3; y < r.y + r.h - 2; y += 12) {
      c.fillStyle = '#434e41'
      c.fillRect(r.x, y, r.w, 1)
    }
    c.fillStyle = '#40543a'
    for (let n = 0; n < (r.w + r.h) / 6; n++) {
      c.fillRect(r.x + Math.floor(rnd() * r.w), r.y + Math.floor(rnd() * r.h), 3, 2)
    }
  }

  // Tire marks, scattered stones, cable runs, and floor drains.
  for (let i = 0; i < 310; i++) {
    const x = 64 + rnd() * (WORLD_W - 128)
    const y = 64 + rnd() * (WORLD_H - 128)
    c.fillStyle = rnd() > 0.5 ? '#303c31' : '#6e7158'
    c.fillRect(Math.floor(x), Math.floor(y), rnd() > 0.8 ? 4 : 2, 2)
  }
  c.strokeStyle = '#222a25'
  c.lineWidth = 2
  c.beginPath()
  c.moveTo(917, 370); c.lineTo(891, 420); c.lineTo(741, 420); c.lineTo(727, 439)
  c.stroke()
  for (const [x, y] of [[596, 346], [737, 561], [483, 266], [849, 330]]) {
    c.fillStyle = '#30372f'; c.fillRect(x, y, 13, 8)
    c.fillStyle = '#737864'
    for (let n = 0; n < 5; n++) c.fillRect(x + 2 + n * 2, y + 2, 1, 4)
  }

  // Utility machines are decorative; their small footprints are solid.
  const machineSolids: Solid[] = []
  for (const [x, y] of [[846, 309], [877, 309], [459, 229], [400, 647]]) {
    c.fillStyle = '#16201a'; c.fillRect(x + 3, y + 5, 22, 23)
    c.fillStyle = '#737b65'; c.fillRect(x, y, 22, 22)
    c.fillStyle = '#929882'; c.fillRect(x, y, 22, 2)
    c.fillStyle = '#434e40'; c.fillRect(x + 3, y + 5, 16, 13)
    c.fillStyle = '#242e29'
    for (let n = 0; n < 4; n++) c.fillRect(x + 4, y + 6 + n * 3, 13, 1)
    c.fillStyle = '#e6a458'; c.fillRect(x + 18, y + 18, 2, 2)
    machineSolids.push({ x, y, w: 22, h: 22, kind: 'rock' })
  }

  // A rusting supply truck, abandoned halfway across the access road.
  const tx = TRUCK.x, ty = TRUCK.y
  c.fillStyle = '#18241ccc'; c.fillRect(tx + 2, ty + 5, 71, 31)
  c.fillStyle = '#181f1a'
  for (const [wx, wy] of [[8, -4], [51, -4], [8, 25], [51, 25]]) c.fillRect(tx + wx, ty + wy, 9, 7)
  c.fillStyle = '#697354'; c.fillRect(tx, ty, 69, 28)
  c.fillStyle = '#93977a'; c.fillRect(tx, ty, 69, 2); c.fillRect(tx, ty, 2, 28)
  c.fillStyle = '#333f30'; c.fillRect(tx + 4, ty + 5, 31, 18)
  c.fillStyle = '#59694c'; c.fillRect(tx + 5, ty + 6, 29, 1)
  c.fillStyle = '#465139'; c.fillRect(tx + 6, ty + 9, 27, 11)
  c.fillStyle = '#8c7f51'; c.fillRect(tx + 10, ty + 10, 11, 9)
  c.fillStyle = '#514f32'; c.fillRect(tx + 11, ty + 12, 9, 2)
  c.fillStyle = '#798262'; c.fillRect(tx + 39, ty + 3, 17, 22)
  c.fillStyle = '#a0a286'; c.fillRect(tx + 40, ty + 3, 15, 2)
  c.fillStyle = '#3b5446'; c.fillRect(tx + 56, ty + 4, 5, 20)
  c.fillStyle = '#637c67'; c.fillRect(tx + 56, ty + 4, 2, 19)
  c.fillStyle = '#879074'; c.fillRect(tx + 62, ty + 3, 7, 22)
  c.fillStyle = '#414b3b'; c.fillRect(tx + 68, ty + 3, 3, 22)
  c.fillStyle = '#ccb383'; c.fillRect(tx + 69, ty + 4, 2, 4); c.fillRect(tx + 69, ty + 20, 2, 4)
  c.fillStyle = '#947651'; c.fillRect(tx + 3, ty + 24, 8, 2); c.fillRect(tx + 47, ty + 24, 7, 2)
  c.fillStyle = '#303d2a'; c.fillRect(tx + 43, ty + 26, 7, 1)

  for (const [x, y] of TREE_POINTS) {
    c.fillStyle = '#1c2a23'
    c.beginPath(); c.ellipse(x + 10, y + 17, 31, 14, -0.45, 0, Math.PI * 2); c.fill()
    c.fillStyle = '#594c37'; c.fillRect(x - 4, y - 10, 8, 20)
    c.fillStyle = '#766448'; c.fillRect(x - 3, y - 8, 2, 14)
    const leafColors = ['#243d2e', '#2a4530', '#345039', '#3d5739', '#4c6240', '#5a7046']
    for (let gy = -38; gy < 25; gy += 4) {
      for (let gx = -31; gx < 32; gx += 4) {
        const normalized = (gx * gx) / 970 + ((gy + 7) * (gy + 7)) / 950
        if (normalized > 1.1 + rnd() * 0.2) continue
        const light = Math.max(0, Math.min(5, Math.floor(rnd() * 3 + (31 - gx - gy) / 31)))
        c.fillStyle = leafColors[light]
        c.fillRect(x + gx, y + gy, 4 + Math.floor(rnd() * 3), 4)
      }
    }
    c.fillStyle = '#718257'
    for (let n = 0; n < 16; n++) {
      c.fillRect(x - 18 + Math.floor(rnd() * 31), y - 29 + Math.floor(rnd() * 29), 2, 1)
    }
  }

  // Clumps of low vegetation at the edges of paths.
  for (let n = 0; n < 240; n++) {
    const p = { x: 48 + rnd() * 1184, y: 48 + rnd() * 800 }
    if (paths.some((r) => inside(p, r, -3))) continue
    for (let i = 0; i < 12; i++) {
      c.fillStyle = grass[Math.floor(rnd() * grass.length)]
      c.fillRect(Math.floor(p.x + rnd() * 15), Math.floor(p.y + rnd() * 9), 2, 2 + Math.floor(rnd() * 3))
    }
  }

  for (const [x, y] of [[534, 301], [805, 403], [543, 597], [705, 233]]) {
    const light = c.createRadialGradient(x, y, 2, x, y, 49)
    light.addColorStop(0, '#ffb45a44'); light.addColorStop(1, '#f4a55a00')
    c.fillStyle = light; c.fillRect(x - 49, y - 49, 98, 98)
    c.fillStyle = '#252b23'; c.fillRect(x - 2, y - 7, 4, 12)
    c.fillStyle = '#c69f5c'; c.fillRect(x - 3, y - 9, 6, 4)
    c.fillStyle = '#ffdb87'; c.fillRect(x - 2, y - 8, 4, 2)
  }

  const props: Prop[] = [
    { x: 753, y: 484, kind: 'barrel', health: 36, active: true },
    { x: 775, y: 486, kind: 'barrel', health: 36, active: true },
    { x: 459, y: 559, kind: 'barrel', health: 36, active: true },
    { x: 444, y: 544, kind: 'crate', health: 48, active: true },
    { x: 792, y: 357, kind: 'crate', health: 48, active: true },
    { x: 484, y: 282, kind: 'crate', health: 48, active: true },
    { x: 936, y: 553, kind: 'barrel', health: 36, active: true },
    { x: 740, y: 647, kind: 'crate', health: 48, active: true },
    { x: 421, y: 667, kind: 'barrel', health: 36, active: true },
  ]
  const loot: Loot[] = [
    { id: 1, x: 696, y: 477, kind: 'shotgun', active: true },
    { id: 2, x: 478, y: 260, kind: 'cache', active: true },
    { id: 3, x: 885, y: 362, kind: 'smg', active: true },
    { id: 4, x: 531, y: 548, kind: 'ammo', active: true },
    { id: 5, x: 691, y: 576, kind: 'medkit', active: true },
    { id: 6, x: 456, y: 672, kind: 'medkit', active: true },
  ]
  return { terrain, solids: [...MINIMAP_SOLIDS, ...machineSolids], props, loot }
}

export function circleHitsRect(x: number, y: number, radius: number, r: Rect) {
  const cx = Math.max(r.x, Math.min(x, r.x + r.w))
  const cy = Math.max(r.y, Math.min(y, r.y + r.h))
  return (x - cx) ** 2 + (y - cy) ** 2 < radius ** 2
}