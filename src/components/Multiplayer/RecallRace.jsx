import { useCallback, useEffect, useRef, useState } from 'react'
import { useVoiceInput } from '../../hooks/useVoiceInput.js'
import { extractSpokenBooks, cleanTranscript } from '../../utils/voiceMatch.js'
import Stage from '../Stage/Stage.jsx'
import Button from '../shared/Button.jsx'
import { Standings, useCountdown } from './parts.jsx'
import recall from '../RecallApp/RecallPlay.module.css'
import styles from './Multiplayer.module.css'

const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/**
 * Book Recall race (multiplayer mode 'recall'): one timed round, everyone
 * names as many books as they can. The server keeps the lists and counts
 * (server/multiplayer/rooms.js recallAnswer); a player only ever receives
 * their own list (their team's in teams) until time is up.
 */
export default function RecallRace({ mp, onLeave }) {
  const { snapshot, send, clockOffset, lastError } = mp
  const { room, you, players, teams, round } = snapshot
  const seconds = useCountdown(round, clockOffset)
  if (!round) return null

  const me = players.find((p) => p.id === you.playerId)
  const myTeam = me && teams?.find((t) => t.id === me.teamId)
  const prompt = round.prompt
  const total = prompt.targets.length
  const mine = round.recall?.mine ?? []
  const open = round.phase === 'open'

  return (
    <Stage>
      <div className={styles.play}>
        <header className={styles.playTop}>
          <div>
            <span className={styles.label}>{open ? 'Time left' : 'Time'}</span>
            <p className={`${styles.playRound} ${open && seconds <= 10 && !round.paused ? styles.clockLow : ''}`}>
              {round.paused ? 'Paused' : open ? clock(seconds) : 'Up!'}
            </p>
          </div>
          <p className={styles.playCode}>{prompt.label} · Room {room.code}</p>
          {me ? (
            <div className={styles.playScore}>
              <span className={styles.label}>{myTeam ? `${myTeam.name}’s list` : 'Your list'}</span>
              <p>{mine.length} <span className={styles.playOf}>/ {total}</span></p>
            </div>
          ) : you.isHost && <p className={styles.hostBadge}>You are hosting</p>}
        </header>

        <div className={styles.playGrid}>
          <main className={`${styles.playMain} ${styles.recallMain}`}>
            {open && me && (
              <>
                <RecallInput key={round.index} paused={round.paused} mine={mine} lastError={lastError} onSend={(payload) => send('answer', payload)} />
                {myTeam && <p className={styles.recallNote}>One shared list for {myTeam.name}: your teammates’ books appear here too.</p>}
                <BookGrid targets={prompt.targets} mine={mine} />
              </>
            )}
            {open && !me && (
              <div className={styles.recallStage}>
                <p className={styles.question}>Name as many books of the Bible as you can!</p>
                <p className={styles.waitLine}>
                  {prompt.label}. Lists stay hidden until time is up; the counts on the right update live.
                </p>
              </div>
            )}
            {!open && <RecallReveal round={round} me={me} myTeam={myTeam} total={total} />}

            {you.isHost && <RecallHostControls round={round} send={send} />}
          </main>

          <aside className={styles.playSide} aria-label="Live board">
            <h2 className={styles.sectionTitle}>{open ? 'Live board' : 'Final counts'}</h2>
            <Standings players={players} teams={teams} youId={you.playerId} metaLabel={() => null} />
            <button type="button" className={styles.backLink} onClick={onLeave}>← Leave game</button>
          </aside>
        </div>
      </div>
    </Stage>
  )
}

// ── Typing and hands-free voice ──────────────────────────────
const VOICE_MESSAGES = {
  'not-allowed':         'Microphone blocked. Allow it in the address bar, then tap the mic again.',
  'no-microphone':       'No microphone found. Check one is connected and not in use.',
  'insecure-context':    'Voice needs a secure (https://) address. Typing still works.',
  'service-unavailable': 'This browser has no speech service. Use Chrome or Edge, or keep typing.',
  'start-failed':        'The microphone could not start. Tap the mic to try again.',
}

function RecallInput({ paused, mine, lastError, onSend }) {
  const [text, setText] = useState('')
  const [feedback, setFeedback] = useState(null) // { message, type: 'success' | 'error' }
  const [shaking, setShaking] = useState(false)
  const inputRef = useRef(null)
  const feedbackTimer = useRef(null)
  const shakeTimer = useRef(null)

  const show = useCallback((message, type) => {
    clearTimeout(feedbackTimer.current)
    setFeedback({ message, type })
    feedbackTimer.current = setTimeout(() => setFeedback(null), 1800)
    if (type === 'error') {
      setShaking(true)
      clearTimeout(shakeTimer.current)
      shakeTimer.current = setTimeout(() => setShaking(false), 450)
    }
  }, [])

  useEffect(() => () => { clearTimeout(feedbackTimer.current); clearTimeout(shakeTimer.current) }, [])

  // The server's word on what counted: new books of mine on the list…
  const seen = useRef(mine.length)
  useEffect(() => {
    if (mine.length > seen.current) {
      const fresh = mine.slice(seen.current).filter((e) => e.yours).map((e) => e.name)
      if (fresh.length) show(`✓ ${fresh.join(', ')}`, 'success')
    }
    seen.current = mine.length
  }, [mine, show])

  // …and what didn't ("not a Bible book", "already on your list")
  const errorAt = useRef(lastError?.at ?? 0)
  useEffect(() => {
    if (!lastError || lastError.at === errorAt.current) return
    errorAt.current = lastError.at
    if (lastError.action === 'answer') show(lastError.message, 'error')
  }, [lastError, show])

  // Back in the box after a pause
  useEffect(() => {
    if (!paused) inputRef.current?.focus()
  }, [paused])

  function submit(e) {
    e.preventDefault()
    const value = text.trim()
    if (!value || paused) return
    onSend({ text: value })
    setText('') // the reply names the book, so the next one can start straight away
  }

  // One tap keeps the mic open for the whole round; a phrase can hold several books
  const voice = useVoiceInput({
    continuous: true,
    onResult: (alternatives) => {
      const books = extractSpokenBooks(alternatives)
      if (!books.length) return show(`Heard “${cleanTranscript(alternatives[0])}”: no Bible book in that`, 'error')
      onSend({ texts: books.slice(0, 10) })
    },
  })

  useEffect(() => {
    if (paused) voice.stop()
  }, [paused, voice.stop])

  const voiceLine = voice.error && VOICE_MESSAGES[voice.error]
    ? { text: VOICE_MESSAGES[voice.error], type: 'error' }
    : voice.listening
      ? { text: voice.interim ? `Heard: ${voice.interim}` : 'Listening. Say book names, as many as you like.', type: 'live' }
      : voice.supported
        ? { text: 'Tap the mic to say book names instead of typing.', type: 'hint' }
        : null

  return (
    <div className={styles.recallInput}>
      <form className={recall.inputRow} onSubmit={submit}>
        <input
          ref={inputRef}
          type="text"
          className={`${recall.input} ${shaking ? recall.inputShake : ''}`}
          aria-label="Bible book name"
          placeholder={paused ? 'Paused' : 'Type a Bible book name…'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="words"
          spellCheck={false}
          disabled={paused}
          autoFocus
        />
        {voice.supported && (
          <button
            type="button"
            className={`${recall.micBtn} ${voice.listening ? recall.micBtnLive : ''}`}
            onClick={voice.listening ? voice.stop : voice.start}
            aria-pressed={voice.listening}
            aria-label={voice.listening ? 'Stop listening' : 'Say book names'}
            title={voice.listening ? 'Stop listening' : 'Say book names'}
            disabled={paused}
          >
            🎤
          </button>
        )}
        <button type="submit" className={recall.submitBtn} aria-label="Add book" disabled={paused}>→</button>
      </form>
      {voiceLine && (
        <p className={`${recall.voiceLine} ${voiceLine.type === 'live' ? recall.voiceLive : ''} ${voiceLine.type === 'error' ? recall.voiceError : ''}`} aria-live="polite">
          {voiceLine.text}
        </p>
      )}
      <div className={recall.feedbackSlot} aria-live="polite">
        {feedback && (
          <span className={`${recall.feedback} ${feedback.type === 'success' ? recall.feedbackSuccess : recall.feedbackError}`}>
            {feedback.message}
          </span>
        )}
      </div>
    </div>
  )
}

/** The target books in canonical order: named ones filled in, the rest hidden (or shown as missed) */
function BookGrid({ targets, mine, showMissed = false }) {
  const named = new Map(mine.map((e) => [e.name, e]))
  return (
    <div className={`${recall.booksGrid} ${styles.recallGrid}`}>
      {targets.map((name) => {
        const entry = named.get(name)
        if (entry) {
          return (
            <span key={name} className={`${recall.chip} ${recall.chipNamed}`} title={entry.yours || !entry.by ? undefined : `Named by ${entry.by}`}>
              {name}
            </span>
          )
        }
        return showMissed
          ? <span key={name} className={`${recall.chip} ${styles.chipMissed}`}>{name}</span>
          : <span key={name} className={`${recall.chip} ${recall.chipEmpty}`} aria-label="Not named yet">?</span>
      })}
    </div>
  )
}

// ── Time's up ────────────────────────────────────────────────
function RecallReveal({ round, me, myTeam, total }) {
  const targets = round.prompt.targets
  const lists = round.recall?.lists ?? []
  const mine = round.recall?.mine ?? []
  // Books that no player or team named
  const namedByAnyone = new Set(lists.flatMap((l) => l.names))
  const nobody = targets.filter((name) => !namedByAnyone.has(name))

  return (
    <section className={`${styles.reveal} ${styles.recallReveal}`} aria-live="polite">
      <p className={styles.revealLabel}>Time’s up</p>
      {me ? (
        <>
          <p className={styles.revealAnswer}>{mine.length} of {total}</p>
          <p className={styles.solvers}>
            {myTeam ? `${myTeam.name} named ${mine.length === total ? 'every book!' : `${mine.length} books.`}` : mine.length === total ? 'You named every book!' : 'Books you named are filled in; the ones you missed are dashed.'}
          </p>
          <BookGrid targets={targets} mine={mine} showMissed />
        </>
      ) : (
        <p className={styles.revealAnswer}>{lists.length ? `${namedByAnyone.size} of ${total}` : 'No books named'}</p>
      )}
      {lists.length > 0 && (
        <p className={styles.recallNobody}>
          {nobody.length === 0
            ? 'Between you, every book was named.'
            : <>Nobody named: <strong>{nobody.join(', ')}</strong></>}
        </p>
      )}
    </section>
  )
}

// ── Host ─────────────────────────────────────────────────────
function RecallHostControls({ round, send }) {
  const open = round.phase === 'open'
  function confirmThen(message, type) {
    if (window.confirm(message)) send(type)
  }
  return (
    <section className={styles.hostPanel} aria-label="Host controls">
      <h2 className={styles.sectionTitle}>Host controls</h2>
      <div className={styles.hostButtons}>
        {open && (round.paused
          ? <Button onClick={() => send('resume_game')}>Resume</Button>
          : <Button variant="ghost" onClick={() => send('pause')}>Pause</Button>)}
        {open && <Button variant="ghost" onClick={() => confirmThen('Stop the clock and show everyone’s results now?', 'reveal')}>End round now</Button>}
        {!open && <Button onClick={() => send('next')}>See final results</Button>}
        <button type="button" className={styles.dangerLink} onClick={() => confirmThen('Restart? Scores reset and everyone returns to the lobby.', 'restart')}>Restart</button>
      </div>
    </section>
  )
}
