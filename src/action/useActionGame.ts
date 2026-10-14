import { useEffect, useRef, useState, type RefObject } from 'react'
import { ActionEngine } from './engine'
import { INITIAL_SNAPSHOT, type RunRecord, type Settings } from './types'

const CONTROL_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight', 'KeyE', 'KeyR', 'KeyQ', 'KeyJ', 'KeyP', 'Escape', 'Enter', 'Digit1', 'Digit2', 'Digit3'])

export function useActionGame(canvasRef: RefObject<HTMLCanvasElement | null>, settings: Settings, blocked: boolean, onFinish: (r: RunRecord) => void) {
  const engineRef = useRef<ActionEngine | null>(null)
  const [snapshot, setSnapshot] = useState(INITIAL_SNAPSHOT)
  const [error, setError] = useState('')
  const finishRef = useRef(onFinish)
  const settingsRef = useRef(settings)
  const blockedRef = useRef(blocked)
  finishRef.current = onFinish
  settingsRef.current = settings
  blockedRef.current = blocked

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let engine: ActionEngine
    try {
      engine = new ActionEngine(canvas, setSnapshot, (r) => finishRef.current(r), settingsRef.current)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The game could not start. Please try another browser.')
      return
    }
    engineRef.current = engine
    const resize = () => engine.resize()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize)
    observer?.observe(canvas)

    const keyDown = (e: KeyboardEvent) => {
      if (blockedRef.current || !CONTROL_KEYS.has(e.code)) return
      const target = e.target as HTMLElement | null
      if (target?.closest('input, select, textarea') || ((e.code === 'Space' || e.code === 'Enter') && target?.closest('button, a'))) return
      e.preventDefault()
      if (!e.repeat) engine.setKey(e.code, true)
    }
    const keyUp = (e: KeyboardEvent) => engine.setKey(e.code, false)
    const pointerMove = (e: PointerEvent) => { if (e.pointerType !== 'touch') engine.pointerMove(e.clientX, e.clientY) }
    const pointerDown = (e: PointerEvent) => {
      if (e.button !== 0 || e.pointerType === 'touch' || blockedRef.current) return
      engine.pointerMove(e.clientX, e.clientY)
      engine.pointerDown(true)
      canvas.setPointerCapture(e.pointerId)
    }
    const pointerUp = () => engine.pointerDown(false)
    const pointerLeave = () => engine.pointerLeave()
    const contextMenu = (e: Event) => e.preventDefault()
    const blur = () => engine.pause()
    const visibility = () => { if (document.hidden) engine.pause() }

    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    window.addEventListener('pointerup', pointerUp)
    window.addEventListener('pointercancel', pointerUp)
    window.addEventListener('blur', blur)
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', visibility)
    canvas.addEventListener('pointermove', pointerMove)
    canvas.addEventListener('pointerdown', pointerDown)
    canvas.addEventListener('pointerleave', pointerLeave)
    canvas.addEventListener('contextmenu', contextMenu)
    return () => {
      observer?.disconnect(); engine.dispose(); engineRef.current = null
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      window.removeEventListener('pointerup', pointerUp)
      window.removeEventListener('pointercancel', pointerUp)
      window.removeEventListener('blur', blur)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', visibility)
      canvas.removeEventListener('pointermove', pointerMove)
      canvas.removeEventListener('pointerdown', pointerDown)
      canvas.removeEventListener('pointerleave', pointerLeave)
      canvas.removeEventListener('contextmenu', contextMenu)
    }
  }, [canvasRef])

  useEffect(() => { engineRef.current?.configure(settings) }, [settings])
  return { snapshot, engineRef, error }
}