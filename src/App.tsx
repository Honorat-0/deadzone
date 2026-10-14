import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useActionGame } from './action/useActionGame'
import { DEFAULT_SETTINGS, formatTime, WEAPONS, type GameSnapshot, type RunRecord, type Settings } from './action/types'
import { EXTRACTION, MINIMAP_SOLIDS, WORLD_H, WORLD_W } from './action/world'
import { BrandMark, Icon, WeaponIcon } from './components/Icons'
import { TouchControls } from './components/TouchControls'

type Panel = 'help' | 'scores' | 'settings' | null
const SETTINGS_KEY = 'deadzone-settings-v1'
const SCORES_KEY = 'deadzone-runs-v1'
const number = (value: number) => value.toLocaleString('en-US')

function readSettings(): Settings {
  const defaults = { ...DEFAULT_SETTINGS, shake: !window.matchMedia('(prefers-reduced-motion: reduce)').matches }
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')
    return { sound: typeof saved.sound === 'boolean' ? saved.sound : defaults.sound,
      volume: Number.isFinite(saved.volume) ? Math.min(100, Math.max(0, saved.volume)) : defaults.volume,
      shake: typeof saved.shake === 'boolean' ? saved.shake : defaults.shake,
      particles: typeof saved.particles === 'boolean' ? saved.particles : defaults.particles }
  } catch { return defaults }
}

function readRecords(): RunRecord[] {
  try {
    const saved = JSON.parse(localStorage.getItem(SCORES_KEY) || '[]')
    return Array.isArray(saved) ? saved.filter((r) => r && typeof r.id === 'string' && Number.isFinite(r.score) && Number.isFinite(r.kills) && Number.isFinite(r.wave) && Number.isFinite(r.seconds)).sort((a, b) => b.score - a.score).slice(0, 10) : []
  } catch { return [] }
}

function Key({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <kbd className={`key ${className}`}>{children}</kbd>
}

function MiniMap({ snapshot }: { snapshot: GameSnapshot }) {
  return <div className="minimap" aria-label="Tactical map: orange is you, red is enemies, yellow is supplies">
    <div className="minimap-label"><span>TACTICAL MAP</span><span className="map-corner" /></div>
    <svg viewBox={`0 0 ${WORLD_W} ${WORLD_H}`} role="img" aria-label="Outpost tactical map">
      <rect width={WORLD_W} height={WORLD_H} fill="#18261e" />
      <path d="M580 32h118v832H580zM64 448h1152v108H64zM390 320h447v297H390z" fill="#384033" />
      {MINIMAP_SOLIDS.map((s, i) => <rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} fill={s.kind === 'wall' ? '#7c846c' : '#36553a'} />)}
      <rect x={EXTRACTION.x - 20} y={EXTRACTION.y - 20} width="40" height="40" fill={snapshot.extractionOpen ? '#c5e4ac' : '#7b886b'} />
      {snapshot.lootPositions.map((p, i) => <rect key={i} x={p.x - 7} y={p.y - 7} width="14" height="14" fill="#d8b56a" />)}
      {snapshot.enemyPositions.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="11" fill="#e8805e" />)}
      <circle cx={snapshot.player.x} cy={snapshot.player.y} r="35" fill="#f6ae622c" />
      <circle cx={snapshot.player.x} cy={snapshot.player.y} r="15" fill="#ffb674" />
    </svg>
    <div className="minimap-coordinates">{Math.round(snapshot.player.x).toString().padStart(4, '0')} : {Math.round(snapshot.player.y).toString().padStart(4, '0')}</div>
  </div>
}

function HelpContent() {
  return <>
    <p className="panel-intro">The outpost is overrun. Find better weapons, clear five waves, then reach the extraction beacon to get out alive.</p>
    <div className="field-manual">
      <div><span className="manual-keys"><Key>W</Key><Key>A</Key><Key>S</Key><Key>D</Key></span><span><strong>Keep moving</strong><small>Move around the outpost. Arrow keys also work.</small></span></div>
      <div><span className="manual-keys"><Icon name="mouse" size={25} /></span><span><strong>Aim & shoot</strong><small>Aim with your mouse. Hold left-click to fire.</small></span></div>
      <div><span className="manual-keys"><Key>SPACE</Key></span><span><strong>Dash through danger</strong><small>A short burst of speed. You're invulnerable while dashing.</small></span></div>
      <div><span className="manual-keys"><Key>SHIFT</Key></span><span><strong>Run for it</strong><small>Hold to sprint. Keep an eye on your stamina.</small></span></div>
      <div><span className="manual-keys"><Key>E</Key></span><span><strong>Scavenge & interact</strong><small>Pick up nearby weapons, ammo, and medkits. Use the beacon to extract.</small></span></div>
      <div><span className="manual-keys"><Key>R</Key><Key>1-3</Key></span><span><strong>Stay loaded</strong><small>Reload with R. Switch weapons with 1, 2, 3, or Q.</small></span></div>
    </div>
    <div className="manual-note"><Icon name="bolt" size={19} /><p><strong>A little field advice.</strong> Shoot barrels to take out a group. Crates can hide supplies. Each cleared wave restores a little health and ammo.</p></div>
    <p className="accessibility-note">Keyboard only? Hold <Key>J</Key> to auto-aim and fire. On touch screens, use the joystick and action buttons. Press <Key>ESC</Key> or <Key>P</Key> to pause.</p>
  </>
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const [panel, setPanel] = useState<Panel>(null)
  const [settings, setSettings] = useState<Settings>(readSettings)
  const [records, setRecords] = useState<RunRecord[]>(readRecords)
  const [expanded, setExpanded] = useState(false)
  const [newBest, setNewBest] = useState(false)
  const best = records[0]?.score || 0
  const { snapshot: game, engineRef, error } = useActionGame(canvasRef, settings, panel !== null, (record) => {
    setNewBest(record.score > best)
    setRecords((current) => [...current, record].sort((a, b) => b.score - a.score).slice(0, 10))
  })
  const active = game.phase === 'playing' || game.phase === 'paused'
  const finished = game.phase === 'dead' || game.phase === 'extracted'

  useEffect(() => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)) } catch { /* The game also works without storage. */ } }, [settings])
  useEffect(() => { try { localStorage.setItem(SCORES_KEY, JSON.stringify(records)) } catch { /* A private session may not allow storage. */ } }, [records])

  useEffect(() => {
    if (!panel) return
    const previous = document.activeElement as HTMLElement | null
    const dialog = dialogRef.current
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]') || [])
    focusable()[0]?.focus()
    const key = (e: KeyboardEvent) => {
      if (e.code === 'Escape') { e.preventDefault(); setPanel(null) }
      if (e.code === 'Tab') {
        const list = focusable(), first = list[0], last = list[list.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
      }
    }
    window.addEventListener('keydown', key)
    return () => { window.removeEventListener('keydown', key); previous?.focus() }
  }, [panel])

  useEffect(() => {
    if (!expanded) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [expanded])

  function openPanel(next: Panel) { engineRef.current?.pause(); setPanel(next) }
  function deploy(button?: HTMLButtonElement) { button?.blur(); setNewBest(false); engineRef.current?.start() }
  function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) { setSettings((current) => ({ ...current, [key]: value })) }

  return <>
    <div className="app-content" inert={panel !== null}>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#game" aria-label="Deadzone home" onClick={() => setPanel(null)}>
            <BrandMark /><span><span className="brand-name">DEADZONE<span className="brand-period">.</span></span><span className="brand-subtitle">2D SURVIVAL / NO SECOND CHANCES</span></span>
          </a>
          <nav className="main-nav" aria-label="Main navigation">
            <button className={!panel ? 'nav-button selected' : 'nav-button'} onClick={(e) => { e.currentTarget.blur(); setPanel(null); engineRef.current?.resume() }}><Icon name="play" size={15} /><span>Play</span></button>
            <button className={panel === 'help' ? 'nav-button selected' : 'nav-button'} aria-label="How to play" onClick={() => openPanel('help')}><Icon name="help" size={17} /><span className="nav-label">How to play</span></button>
            <button className={panel === 'scores' ? 'nav-button selected' : 'nav-button'} aria-label="View local leaderboard" onClick={() => openPanel('scores')}><Icon name="trophy" size={17} /><span className="nav-label">Leaderboard</span></button>
          </nav>
          <div className="header-end"><span className="version">LOCAL BUILD <span>V.01</span></span><button className="icon-button header-settings" aria-label="Open settings" title="Settings" onClick={() => openPanel('settings')}><Icon name="settings" size={19} /></button></div>
        </div>
      </header>

      <main className="main-content" id="game">
        <div className="section-heading">
          <div><div className="eyebrow"><span>01</span><span className="eyebrow-line" />SURVIVAL</div><div className="heading-line"><h1>The Outpost</h1><p>No backup. No second chances.</p></div></div>
          <div className="personal-best"><Icon name="trophy" size={16} /><span>PERSONAL BEST</span><strong>{number(best)}</strong></div>
        </div>

        <section className={`game-shell ${expanded ? 'expanded' : ''}`} aria-label="Deadzone game">
          <div className="game-toolbar">
            <div className="sector-title"><span className={`status-dot ${game.phase === 'playing' ? 'live' : ''}`} /><strong>SECTOR 07</strong><span className="toolbar-divider">/</span><span>ABANDONED OUTPOST</span></div>
            <div className="toolbar-right"><span className="operation-state">{game.phase === 'ready' ? 'AWAITING DEPLOYMENT' : game.phase === 'playing' ? 'OPERATION LIVE' : game.phase === 'paused' ? 'OPERATION PAUSED' : 'OPERATION COMPLETE'}</span>
              <button className="icon-button" disabled={!active} title={game.phase === 'paused' ? 'Resume (P)' : 'Pause (P)'} aria-label={game.phase === 'paused' ? 'Resume game' : 'Pause game'} onClick={(e) => { e.currentTarget.blur(); engineRef.current?.togglePause() }}><Icon name={game.phase === 'paused' ? 'play' : 'pause'} size={15} /></button>
              <button className={`icon-button ${!settings.sound ? 'is-muted' : ''}`} title={settings.sound ? 'Mute sound' : 'Unmute sound'} aria-label={settings.sound ? 'Mute sound' : 'Unmute sound'} onClick={(e) => { e.currentTarget.blur(); updateSetting('sound', !settings.sound) }}><Icon name={settings.sound ? 'volume' : 'muted'} size={17} /></button>
              <button className="icon-button" title={expanded ? 'Exit expanded view' : 'Expand game'} aria-label={expanded ? 'Exit expanded view' : 'Expand game'} aria-pressed={expanded} onClick={(e) => { e.currentTarget.blur(); setExpanded(!expanded) }}><Icon name={expanded ? 'collapse' : 'expand'} size={17} /></button>
            </div>
          </div>

          <div className={`game-viewport ${game.phase === 'playing' ? 'is-playing' : ''}`}>
            <canvas ref={canvasRef} className="world-canvas" aria-label="Top-down pixel-art outpost. Move with WASD, aim with your mouse, click to shoot, and press Space to dash." />
            <div className="scanlines" />

            {game.phase === 'ready' && !error && <>
              <div className="briefing-shade" />
              <div className="briefing">
                <div className="briefing-eyebrow"><span className="small-cross">+</span> FIGHT. SCAVENGE. SURVIVE.</div>
                <h2>DEADZONE</h2>
                <p>Find your firepower. Fight through the horde.<br />Make it out alive.</p>
                <button className="primary-button deploy-button" onClick={(e) => deploy(e.currentTarget)}>Deploy into outpost<Icon name="arrow" size={19} /></button>
                <span className="deploy-hint">OR PRESS <Key>ENTER</Key> TO DEPLOY</span>
              </div>
              <div className="mission-brief"><Icon name="crosshair" size={18} /><div><span>YOUR MISSION</span><strong>Clear the outpost</strong><small>Survive 5 waves. Reach extraction.</small></div></div>
              <div className="world-caption"><span className="tiny-square" />A PLACE THAT DOESN'T WANT YOU HERE.</div>
            </>}

            {active && <>
              <div className="health-hud"><div className="health-heading"><Icon name="heart" size={16} /><span>VITALS</span><strong className={game.health <= 25 ? 'critical-text' : ''}>{game.health}<small>/100</small></strong></div><div className="health-track"><div style={{ width: `${game.health}%`, background: game.health <= 25 ? '#e76650' : undefined }} /></div><div className="stamina-row"><Icon name="bolt" size={11} /><div className="stamina-track"><span style={{ width: `${game.stamina}%` }} /></div></div></div>
              <div className="wave-hud"><div><span>WAVE</span><strong>{game.wave.toString().padStart(2, '0')}</strong><small>/ 05</small></div><p><span className="hostile-dot" />{game.extractionOpen ? 'Extraction is open' : game.waveBreak ? `Next wave in ${game.waveBreak}s` : `${game.enemies.toString().padStart(2, '0')} hostiles remaining`}</p><div className="wave-track"><span style={{ width: `${game.waveKills / game.waveTotal * 100}%` }} /></div></div>
              <div className="run-hud"><span><Icon name="skull" size={16} /><b>{game.kills}</b><small>ELIMINATED</small></span><span className="hud-separator" /><span><Icon name="clock" size={14} />{formatTime(game.seconds)}</span></div>
              {game.notice && <div className="game-notice" role="status" key={game.notice}><span className="notice-bar" />{game.notice}</div>}
              {game.prompt && game.phase === 'playing' && <button className="interact-prompt" onClick={(e) => { e.currentTarget.blur(); engineRef.current?.interact() }}><Key>E</Key>{game.prompt}<Icon name="chevron" size={14} /></button>}
              {game.phase === 'playing' && <TouchControls engineRef={engineRef} dash={game.dash} />}
            </>}

            {!finished && <MiniMap snapshot={game} />}

            {game.phase === 'paused' && <div className="pause-overlay"><div className="pause-content"><span className="overlay-eyebrow">OPERATION ON HOLD</span><h2>Take a breather.</h2><p>The outpost can wait. Your run is safe right here.</p><button className="primary-button" onClick={(e) => { e.currentTarget.blur(); engineRef.current?.resume() }}><Icon name="play" size={16} />Resume operation</button><button className="text-button" onClick={(e) => deploy(e.currentTarget)}><Icon name="restart" size={14} />Restart run</button><span className="overlay-shortcut">PRESS P OR SPACE TO RESUME</span></div></div>}

            {finished && <div className="result-overlay"><div className="result-content"><span className="overlay-eyebrow">{game.phase === 'extracted' ? 'MISSION ACCOMPLISHED' : 'SIGNAL LOST / SECTOR 07'}</span><h2>{game.phase === 'extracted' ? 'You made it out.' : 'End of the line.'}</h2><p>{game.phase === 'extracted' ? 'The outpost is clear. Live to fight another day.' : 'The outpost got you. Come back better armed.'}</p><div className="result-score"><span>FINAL SCORE</span><strong>{number(game.score)}</strong>{newBest && <small><Icon name="trophy" size={13} />NEW PERSONAL BEST</small>}</div><div className="result-details"><span><b>{game.kills}</b> Eliminated</span><span><b>{formatTime(game.seconds)}</b> Survived</span><span><b>{game.wave}/5</b> Wave</span></div><button className="primary-button" onClick={(e) => deploy(e.currentTarget)}><Icon name="restart" size={16} />Deploy again</button><button className="text-button" onClick={() => engineRef.current?.resetReady()}>Return to briefing<Icon name="arrow" size={14} /></button></div></div>}

            {error && <div className="pause-overlay"><div className="pause-content"><h2>Connection interrupted.</h2><p role="alert">{error}</p><button className="primary-button" onClick={() => window.location.reload()}>Try again<Icon name="restart" size={17} /></button></div></div>}
          </div>

          <div className="loadout-bar">
            <div className="loadout-label"><Icon name="box" size={17} /><span>LOADOUT</span></div>
            <div className="weapon-slots">
              {WEAPONS.map((weapon, index) => {
                const status = game.weapons[index], selected = game.activeWeapon === index
                return <button key={weapon.id} className={`weapon-slot ${selected ? 'equipped' : ''} ${!status.owned ? 'locked' : ''}`} disabled={!status.owned || !active} onClick={(e) => { e.currentTarget.blur(); engineRef.current?.selectWeapon(index) }} aria-label={`${status.owned ? 'Equip' : 'Find'} ${weapon.name}`} aria-pressed={selected} title={status.owned ? `Equip ${weapon.name} (${index + 1})` : `Find ${weapon.name} in the outpost`}><Key>{index + 1}</Key><WeaponIcon id={weapon.id} /><span className="weapon-info"><strong>{weapon.name}</strong><small>{status.owned ? selected ? game.reload > 0 ? 'RELOADING...' : 'EQUIPPED' : 'READY TO EQUIP' : 'FIND IN THE OUTPOST'}</small></span>{status.owned ? <span className="weapon-ammo"><b>{status.ammo.toString().padStart(2, '0')}</b><small>/ {status.reserve < 0 ? 'INF' : status.reserve}</small></span> : <Icon name="lock" size={14} className="weapon-lock" />}</button>
              })}
            </div>
            <button className="dash-control" onClick={(e) => { e.currentTarget.blur(); engineRef.current?.dash() }} disabled={game.phase !== 'playing' || game.dash < 1} title="Dash (Space)"><Icon name="bolt" size={20} /><span><span className="dash-label">DASH<Key>SPACE</Key></span><span className="dash-charge"><span style={{ width: `${game.dash * 100}%` }} /></span><small>{game.dash >= 1 ? 'READY' : `${((1 - game.dash) * 1.2).toFixed(1)}s`}</small></span></button>
            {game.reload > 0 && <div className="reload-indicator" style={{ width: `${game.reload * 100}%` }} />}
          </div>

          <div className="controls-guide"><span className="guide-label">CONTROLS</span><span><span className="move-keys"><Key>W</Key><Key>A</Key><Key>S</Key><Key>D</Key></span>Move</span><span><Icon name="mouse" size={16} />Aim & shoot</span><span><Key>SPACE</Key>Dash</span><span><Key>SHIFT</Key>Sprint</span><span><Key>E</Key>Interact</span><span><Key>R</Key>Reload</span><button onClick={() => openPanel('help')}>All controls<Icon name="arrow" size={13} /></button></div>
        </section>
        <footer className="session-footer"><span><span className="save-mark" /><span>YOUR BEST RUNS ARE SAVED ON THIS DEVICE</span></span><span>STAY SHARP. STAY ALIVE.<span className="footer-cross">+</span></span></footer>
      </main>
    </div>

    {panel && <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setPanel(null) }}><div ref={dialogRef} className={`game-panel panel-${panel}`} role="dialog" aria-modal="true" aria-labelledby="panel-title"><div className="panel-header"><div><span className="eyebrow">{panel === 'help' ? 'FIELD MANUAL' : panel === 'scores' ? 'LOCAL RECORDS' : 'MAKE IT YOURS'}</span><h2 id="panel-title">{panel === 'help' ? 'Know your moves.' : panel === 'scores' ? 'Your best runs.' : 'Game settings.'}</h2></div><button className="icon-button panel-close" aria-label="Close panel" onClick={() => setPanel(null)}><Icon name="close" size={21} /></button></div>
      {panel === 'help' && <HelpContent />}
      {panel === 'scores' && <><p className="panel-intro">No global competition. Just you, the outpost, and a score to beat. Your top ten runs are stored on this device.</p>{records.length ? <><div className="score-table-wrap"><table className="score-table"><thead><tr><th>#</th><th>SCORE</th><th>KILLS</th><th>WAVE</th><th>TIME</th><th>OUTCOME</th></tr></thead><tbody>{records.map((r, i) => <tr key={r.id}><td>{String(i + 1).padStart(2, '0')}</td><td>{number(r.score)}</td><td>{r.kills}</td><td>{r.wave}/5</td><td>{formatTime(r.seconds)}</td><td className={r.extracted ? 'extracted-result' : ''}>{r.extracted ? 'EXTRACTED' : 'LOST'}</td></tr>)}</tbody></table></div><button className="text-button clear-records" onClick={() => { setRecords([]); setNewBest(false) }}>Clear local records<Icon name="close" size={13} /></button></> : <div className="empty-records"><Icon name="trophy" size={36} /><h3>Every survivor starts somewhere.</h3><p>Deploy into the outpost to set your first score.</p><button className="primary-button" onClick={(e) => { setPanel(null); deploy(e.currentTarget) }}>Start your first run<Icon name="arrow" size={17} /></button></div>}</>}
      {panel === 'settings' && <><p className="panel-intro">Tune the experience. Settings are saved automatically.</p><div className="settings-list">{([{ key: 'sound', title: 'Sound effects', text: 'Gunfire, explosions, and the sound of a clean escape.' }, { key: 'shake', title: 'Screen shake', text: 'Feel the impact of gunfire, explosions, and enemy hits.' }, { key: 'particles', title: 'Particle effects', text: 'Muzzle sparks, dash trails, and drifting embers.' }] as const).map((item) => <div className="setting-row" key={item.key}><label id={`setting-${item.key}`}><strong>{item.title}</strong><span>{item.text}</span></label><button className={`switch ${settings[item.key] ? 'on' : ''}`} role="switch" aria-checked={settings[item.key]} aria-labelledby={`setting-${item.key}`} onClick={() => updateSetting(item.key, !settings[item.key])}><span /></button></div>)}<div className="volume-setting"><label htmlFor="volume"><span>Effects volume</span><strong>{settings.volume}%</strong></label><input id="volume" type="range" min="0" max="100" value={settings.volume} onChange={(e) => updateSetting('volume', Number(e.target.value))} style={{ '--volume': `${settings.volume}%` } as CSSProperties} /></div></div><button className="text-button restore-settings" onClick={() => setSettings({ ...DEFAULT_SETTINGS })}><Icon name="restart" size={14} />Restore defaults</button></>}
      <div className="panel-footer"><span><span className="status-dot" />{game.phase === 'paused' ? 'Your operation is paused.' : 'Ready when you are.'}</span><span><Key>ESC</Key> to close</span></div>
    </div></div>}
  </>
}
