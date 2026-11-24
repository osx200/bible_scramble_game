import { useState } from 'react'
import { inviteUrl, qrUrl } from '../../utils/multiplayerApi.js'
import Stage from '../Stage/Stage.jsx'
import Button from '../shared/Button.jsx'
import { Standings } from './parts.jsx'
import styles from './Multiplayer.module.css'

const REVEAL_LABEL = { round: 'after each round', instant: 'straight away' }

/** The waiting room: code, link, QR and the live player list */
export default function Lobby({ mp, onLeave }) {
  const { snapshot, send } = mp
  const { room, you, players, teams } = snapshot
  const s = room.settings
  const link = inviteUrl(room.code)
  const [copied, setCopied] = useState(null)
  const enough = players.length >= s.minPlayers
  const me = players.find((p) => p.id === you.playerId)

  async function copy(text, what) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(what)
      setTimeout(() => setCopied(null), 1800)
    } catch {
      setCopied('failed')
    }
  }

  async function share() {
    try {
      await navigator.share({ title: 'Join my Bible Games', text: `Join my game with code ${room.code}`, url: link })
    } catch {
      // Cancelled, or the share sheet isn't available: copying still works
    }
  }

  function kick(p) {
    if (window.confirm(`Remove ${p.name} from this game?`)) send('kick', { playerId: p.id })
  }

  function closeRoom() {
    if (window.confirm('Close this room for everyone?')) send('close')
  }

  return (
    <Stage art="ezra" wide>
      <div className={styles.screen}>
        <h1>{you.isHost ? 'Your game is ready' : `${room.hostName}’s game`}</h1>
        <p className={styles.lead}>
          {you.isHost
            ? 'Share the code or link. Players appear below as they join.'
            : room.hostConnected ? 'You’re in. Waiting for the host to start.' : 'You’re in. The host is reconnecting…'}
        </p>

        <div className={styles.invite}>
          <div className={styles.inviteMain}>
            <span className={styles.label}>Room code</span>
            <p className={styles.roomCode} aria-label={`Room code ${room.code.split('').join(' ')}`}>{room.code}</p>
            <p className={styles.inviteLink}>{link}</p>
            <div className={styles.inlineActions}>
              <button type="button" className={styles.chipBtn} onClick={() => copy(link, 'link')}>{copied === 'link' ? 'Link copied' : 'Copy link'}</button>
              <button type="button" className={styles.chipBtn} onClick={() => copy(room.code, 'code')}>{copied === 'code' ? 'Code copied' : 'Copy code'}</button>
              {typeof navigator.share === 'function' && <button type="button" className={styles.chipBtn} onClick={share}>Share…</button>}
            </div>
            {copied === 'failed' && <p className={styles.error}>Copy isn’t allowed here. Select the link above instead.</p>}
          </div>
          <img className={styles.qr} src={qrUrl(room.code)} alt={`QR code that opens ${link}`} width="168" height="168" />
        </div>

        {s.mode === 'recall' ? (
          <ul className={styles.facts} aria-label="Game settings">
            <li>{room.modeLabel}</li>
            <li>{s.seconds / 60} min to name as many books as you can</li>
            <li>1 point per book</li>
            {s.teams && <li>{s.teams.length} teams, one shared list each</li>}
          </ul>
        ) : (
        <ul className={styles.facts} aria-label="Game settings">
          <li>{room.modeLabel}</li>
          {s.mode === 'unscramble' && s.wordSet !== 'custom' && <li className={styles.cap}>{s.difficulty}</li>}
          <li>{s.mode === 'unscramble' ? `${s.rounds} rounds` : 'All questions'}</li>
          <li>{s.seconds}s per round</li>
          {s.firstCorrect ? <li>First correct answer wins</li> : <li>Results {REVEAL_LABEL[s.reveal]}</li>}
          {s.speedBonus && <li>Speed bonus</li>}
          {s.teams && <li>{s.teams.length} teams</li>}
        </ul>
        )}

        <h2 className={styles.sectionTitle}>
          Players <span className={styles.count}>{players.length}</span>
        </h2>
        {players.length === 0 ? (
          <p className={styles.empty}>Nobody yet. Players appear here as soon as they join.</p>
        ) : (
          <Standings players={players} teams={teams} youId={you.playerId} onKick={you.isHost ? kick : null} compact />
        )}

        {s.teams && me && (
          <div className={styles.field}>
            <span className={styles.label}>Your team</span>
            <div className={styles.pills}>
              {s.teams.map((t) => (
                <button key={t.id} type="button" className={`${styles.pill} ${me.teamId === t.id ? styles.pillOn : ''}`} aria-pressed={me.teamId === t.id} onClick={() => send('set_team', { teamId: t.id })}>
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={styles.actions}>
          {you.isHost && (
            <>
              <Button size="lg" disabled={!enough} onClick={() => send('start')}>
                {enough ? 'Start game' : `Waiting for ${s.minPlayers - players.length} more`}
              </Button>
              <button type="button" className={styles.dangerLink} onClick={closeRoom}>Close room</button>
            </>
          )}
          <button type="button" className={styles.backLink} onClick={onLeave}>← Leave</button>
        </div>
      </div>
    </Stage>
  )
}
