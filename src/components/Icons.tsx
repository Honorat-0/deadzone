import type { CSSProperties, ReactNode } from 'react'
import type { WeaponId } from '../action/types'

export type IconName = 'crosshair' | 'arrow' | 'pause' | 'play' | 'volume' | 'muted' | 'expand' | 'collapse' | 'settings' | 'close' | 'bolt' | 'skull' | 'heart' | 'lock' | 'mouse' | 'box' | 'restart' | 'trophy' | 'check' | 'chevron' | 'clock' | 'help'

const paths: Record<IconName, ReactNode> = {
  crosshair: <><circle cx="12" cy="12" r="7" /><path d="M12 2v5m0 10v5M2 12h5m10 0h5" /><circle cx="12" cy="12" r="1" /></>,
  arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
  pause: <><path d="M8 5v14M16 5v14" strokeWidth="3" /></>,
  play: <path d="m8 5 11 7-11 7V5Z" />,
  volume: <><path d="m11 5-5 4H3v6h3l5 4V5Z" /><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" /></>,
  muted: <><path d="m11 5-5 4H3v6h3l5 4V5Z" /><path d="m16 9 6 6m0-6-6 6" /></>,
  expand: <path d="M9 3H3v6m12-6h6v6M3 15v6h6m6 0h6v-6" />,
  collapse: <path d="M3 9h6V3m12 6h-6V3M3 15h6v6m6 0v-6h6" />,
  settings: <><path d="m9 3-1 3-3 1-2 3 2 2-1 3 3 2 2-1 3 1 2-1 3 1 3-2-1-3 2-2-2-3-3-1-1-3H9Z" /><circle cx="12" cy="11" r="3" /></>,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  bolt: <path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z" />,
  skull: <><path d="M7 17H5v-6a7 7 0 0 1 14 0v6h-2v4H7v-4Z" /><circle cx="8.5" cy="11" r="1.5" /><circle cx="15.5" cy="11" r="1.5" /><path d="m12 14-1 2h2l-1-2Zm-2 4v3m4-3v3" /></>,
  heart: <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z" />,
  lock: <><rect x="5" y="10" width="14" height="11" rx="1" /><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2" /></>,
  mouse: <><rect x="6" y="2" width="12" height="20" rx="6" /><path d="M12 2v7m-6 0h12" /></>,
  box: <><path d="m12 3 9 5v10l-9 5-9-5V8l9-5Zm0 10L3 8m9 5 9-5m-9 5v10m-5-18 9 5" /></>,
  restart: <><path d="M3 5v6h6M3 11a9 9 0 1 1 2 7" /></>,
  trophy: <><path d="M7 3h10v6a5 5 0 0 1-10 0V3Zm5 11v6m-5 1h10M7 5H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 8a2.5 2.5 0 1 1 3 3.5c-.5.2-.5 1.5-.5 1.5m0 4h.01" /></>,
}

export function Icon({ name, size = 18, className = '', style }: { name: IconName; size?: number; className?: string; style?: CSSProperties }) {
  return <svg width={size} height={size} className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

export function BrandMark() {
  return <svg className="brand-mark" width="31" height="34" viewBox="0 0 31 34" fill="none" aria-hidden="true"><path d="M3 1h14l11 10v12L17 33H3V1Z" fill="currentColor" /><path d="M10 9h5l6 5v6l-6 5h-5V9Z" fill="#141612" /><path d="M0 15h14v4H0z" fill="#141612" /><path d="m20 0 11 10h-6L14 0h6Z" fill="#141612" /></svg>
}

export function WeaponIcon({ id, className = '' }: { id: WeaponId; className?: string }) {
  return (
    <svg className={`weapon-drawing ${className}`} width="66" height="32" viewBox="0 0 66 32" fill="none" shapeRendering="crispEdges" aria-hidden="true">
      {id === 'pistol' ? <><path d="M10 7h42v4h5v5H30l-5 15H12l5-16h-7V7Z" fill="currentColor" /><path d="M14 7h32v3H14V7Z" fill="#dedcc7" /><path d="M14 18h9l-3 10h-9l3-10Z" fill="#5f6758" /><path d="M34 12h13v2H34z" fill="#737d66" /></> : id === 'shotgun' ? <><path d="M3 14h18v-5h41v9H24l-8 9H3V14Z" fill="currentColor" /><path d="M23 9h39v3H23zm0 7h39v2H23z" fill="#d0d0bc" /><path d="M3 16h14v8H3z" fill="#86704f" /><path d="M28 12h12v4H28z" fill="#986f4b" /><path d="M59 9h4v9h-4z" fill="#5f6758" /></> : <><path d="M2 13h13V8h31v4h16v5H40v5H25l-3 9H12l4-14H2v-4Z" fill="currentColor" /><path d="M16 8h29v3H16z" fill="#cecfb9" /><path d="M29 17h8v13h-8z" fill="#6c7a64" /><path d="M14 22h9l-3 7h-9z" fill="#505b49" /><path d="M45 12h17v2H45z" fill="#8d9980" /></>}
    </svg>
  )
}