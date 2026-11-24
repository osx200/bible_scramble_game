import { useEffect } from 'react'
import { useMultiplayer } from '../../hooks/useMultiplayer.js'
import Stage from '../Stage/Stage.jsx'
import Button from '../shared/Button.jsx'
import Lobby from './Lobby.jsx'
import PlayView from './PlayView.jsx'
import FinalResults from './FinalResults.jsx'
import { Notices, useNotices } from './parts.jsx'
import styles from './Multiplayer.module.css'

/** One live room: connection, notices, and the screen for the room's status */
export default function RoomView({ code, token, onLeave, onSeatInvalid }) {
  const [notices, pushNotice] = useNotices()
  const mp = useMultiplayer({ code, token, onNotice: pushNotice })
  const { snapshot, connection, closed, lastError } = mp

  // Server refusals ("Only the host can do that", "Time is up") as notices
  // (Book Recall shows its own refusals under the answer box instead)
  useEffect(() => {
    const recallAnswer = lastError?.action === 'answer' && snapshot?.room.settings.mode === 'recall'
    if (lastError && !recallAnswer) pushNotice({ text: lastError.message, tone: 'warn' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastError])

  // This device's seat isn't valid any more (e.g. storage from an old game)
  useEffect(() => {
    if (closed?.reason === 'unauthorized') onSeatInvalid()
  }, [closed, onSeatInvalid])

  if (closed && closed.reason !== 'unauthorized') {
    return (
      <Stage art="jonathan">
        <div className={styles.screen}>
          <h1>{closed.reason === 'kicked' ? 'Removed from the game' : 'Game over'}</h1>
          <p className={styles.lead}>{closed.message}</p>
          <div className={styles.actions}>
            <Button size="lg" onClick={onLeave}>Back to Menu</Button>
          </div>
        </div>
      </Stage>
    )
  }

  if (!snapshot) {
    return (
      <Stage art="ezra">
        <div className={styles.screen}>
          <h1>Connecting…</h1>
          <p className={styles.lead}>Joining room {code}.</p>
          {connection === 'reconnecting' && <p className={styles.lead}>Still trying. Check your internet connection.</p>}
          <button type="button" className={styles.backLink} onClick={onLeave}>← Back to Menu</button>
        </div>
      </Stage>
    )
  }

  const status = snapshot.room.status
  return (
    <>
      {status === 'lobby' && <Lobby mp={mp} onLeave={onLeave} />}
      {status === 'playing' && <PlayView mp={mp} onLeave={onLeave} />}
      {status === 'finished' && <FinalResults mp={mp} onLeave={onLeave} />}

      {connection === 'reconnecting' && (
        <div className={styles.reconnect} role="status">
          <div className={styles.reconnectCard}>
            <p className={styles.reconnectTitle}>Reconnecting…</p>
            <p>Your score and answers are safe on the server. This usually takes a few seconds.</p>
          </div>
        </div>
      )}
      <Notices notices={notices} />
    </>
  )
}
