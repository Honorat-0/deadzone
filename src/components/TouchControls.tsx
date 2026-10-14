import { useRef, useState, type PointerEvent, type RefObject } from 'react'
import type { ActionEngine } from '../action/engine'
import { Icon } from './Icons'

export function TouchControls({ engineRef, dash }: { engineRef: RefObject<ActionEngine | null>; dash: number }) {
  const [stick, setStick] = useState({ x: 0, y: 0 })
  const pointer = useRef<number | null>(null)
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (pointer.current !== e.pointerId) return
    const r = e.currentTarget.getBoundingClientRect()
    const dx = (e.clientX - r.left - r.width / 2) / 35
    const dy = (e.clientY - r.top - r.height / 2) / 35
    const length = Math.max(1, Math.hypot(dx, dy))
    const next = { x: dx / length, y: dy / length }
    setStick(next); engineRef.current?.setStick(next.x, next.y)
  }
  const release = () => { pointer.current = null; setStick({ x: 0, y: 0 }); engineRef.current?.setStick(0, 0) }
  return <div className="touch-controls">
    <div className="joystick" role="group" aria-label="Movement joystick"
      onPointerDown={(e) => { pointer.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); move(e) }}
      onPointerMove={move} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}>
      <span className="joystick-cross" />
      <span className="joystick-thumb" style={{ transform: `translate(${stick.x * 27}px, ${stick.y * 27}px)` }} />
    </div>
    <div className="touch-actions">
      <button className="touch-reload" aria-label="Reload weapon" onClick={() => engineRef.current?.reload()}><Icon name="restart" /></button>
      <button className="touch-dash" aria-label="Dash" disabled={dash < 1} onClick={() => engineRef.current?.dash()}><Icon name="bolt" size={21} /></button>
      <button className="touch-fire" aria-label="Hold to fire with auto-aim"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); engineRef.current?.setTouchFire(true) }}
        onPointerUp={() => engineRef.current?.setTouchFire(false)} onPointerCancel={() => engineRef.current?.setTouchFire(false)}
        onLostPointerCapture={() => engineRef.current?.setTouchFire(false)}><Icon name="crosshair" size={27} /></button>
    </div>
  </div>
}