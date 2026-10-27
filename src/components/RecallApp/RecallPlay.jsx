import { useState, useEffect, useRef, useCallback } from 'react'
import { matchBookName } from '../../data/canonicalBooks.js'
import { useVoiceInput } from '../../hooks/useVoiceInput.js'
import { extractSpokenBooks, cleanTranscript } from '../../utils/voiceMatch.js'
import styles from './RecallPlay.module.css'
import Stage from '../Stage/Stage.jsx'

// Why the mic stopped or can't start, in plain words
const VOICE_MESSAGES = {
  'not-allowed':         'Microphone blocked. Allow it in the address bar, then tap the mic again.',
  'no-microphone':       'No microphone found. Check one is connected and not in use.',
  'insecure-context':    'Voice needs a secure (https://) address. Typing still works.',
  'service-unavailable': 'This browser has no speech service. Use Chrome or Edge, or keep typing.',
  'start-failed':        'The microphone could not start. Tap the mic to try again.',
}

const list = (names) => names.join(', ')

function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function RecallPlay({ config, onFinish }) {
  const { timerDuration, targetBooks } = config
  const total = targetBooks.length

  const [timeRemaining, setTimeRemaining] = useState(timerDuration)
  const [inputValue,    setInputValue]    = useState('')
  const [namedSet,      setNamedSet]      = useState(() => new Set())
  const [feedback,      setFeedback]      = useState(null) // { message, type: 'success'|'error' }
  const [shaking,       setShaking]       = useState(false)
  const [done,          setDone]          = useState(false)

  const inputRef     = useRef(null)
  const feedbackRef  = useRef(null)
  const namedSetRef  = useRef(namedSet)
  const doneRef      = useRef(false) // read by the voice callback, which outlives renders

  // Keep ref in sync so the timer-expiry handler sees fresh data
  useEffect(() => { namedSetRef.current = namedSet }, [namedSet])

  // ── Countdown timer ──────────────────────────────────────────
  useEffect(() => {
    if (done) return
    const id = setInterval(() => {
      setTimeRemaining(t => {
        if (t <= 1) {
          clearInterval(id)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [done])

  // When time hits 0, finish
  useEffect(() => {
    if (timeRemaining === 0 && !done) {
      setDone(true)
      onFinish([...namedSetRef.current])
    }
  }, [timeRemaining, done, onFinish])

  // ── Input handling ───────────────────────────────────────────
  const triggerShake = useCallback(() => {
    setShaking(true)
    setTimeout(() => setShaking(false), 450)
  }, [])

  const showFeedback = useCallback((message, type, duration = 1400) => {
    clearTimeout(feedbackRef.current)
    setFeedback({ message, type })
    feedbackRef.current = setTimeout(() => setFeedback(null), duration)
  }, [])

  useEffect(() => () => clearTimeout(feedbackRef.current), [])

  /**
   * The one place books get added, for typing and voice alike. Works off the
   * ref so a single spoken phrase with several books ("Genesis Exodus
   * Leviticus") can't race its own state updates.
   * → { added, duplicates, outside }
   */
  const addBooks = useCallback((canonicals) => {
    const next = new Set(namedSetRef.current)
    const result = { added: [], duplicates: [], outside: [] }
    for (const name of canonicals) {
      if (!targetBooks.some(b => b.name === name)) result.outside.push(name)
      else if (next.has(name)) result.duplicates.push(name)
      else { next.add(name); result.added.push(name) }
    }
    if (result.added.length) {
      namedSetRef.current = next
      setNamedSet(next)
    }
    return result
  }, [targetBooks])

  function handleSubmit(e) {
    e.preventDefault()
    const raw = inputValue.trim()
    if (!raw) return

    const canonical = matchBookName(raw)

    if (!canonical) {
      triggerShake()
      showFeedback('Not a Bible book - check your spelling', 'error')
      return
    }

    const { added, duplicates } = addBooks([canonical])
    if (!added.length) {
      triggerShake()
      showFeedback(duplicates.length
        ? `${canonical} already named!`
        : `${canonical} is not in the selected category`, 'error')
      return
    }

    setInputValue('')
    showFeedback(`✓ ${canonical}`, 'success', 1200)
    inputRef.current?.focus()
  }

  // ── Voice: hands-free for the whole round ────────────────────
  // One tap keeps the mic open; every phrase can name several books.
  const handleSpoken = useCallback((alternatives) => {
    if (doneRef.current) return
    const books = extractSpokenBooks(alternatives)
    if (!books.length) {
      showFeedback(`Heard "${cleanTranscript(alternatives[0])}" - no Bible book in that`, 'error', 1800)
      return
    }
    const { added, duplicates, outside } = addBooks(books)
    const notes = [
      duplicates.length && `already had ${list(duplicates)}`,
      outside.length && `${list(outside)} not in this category`,
    ].filter(Boolean).join('; ')
    if (added.length) {
      showFeedback(`✓ ${list(added)}${notes ? ` (${notes})` : ''}`, 'success', 1800)
    } else {
      triggerShake()
      showFeedback(notes.charAt(0).toUpperCase() + notes.slice(1), 'error', 1800)
    }
  }, [addBooks, showFeedback, triggerShake])

  const voice = useVoiceInput({ onResult: handleSpoken, continuous: true })

  // The round is over: close the mic
  useEffect(() => {
    doneRef.current = done
    if (done) voice.stop()
  }, [done, voice.stop])

  const voiceStatus = voice.error && VOICE_MESSAGES[voice.error]
    ? { text: VOICE_MESSAGES[voice.error], type: 'error' }
    : voice.listening
      ? { text: voice.interim ? `Heard: ${voice.interim}` : 'Listening. Say book names, as many as you like.', type: 'live' }
      : voice.supported
        ? { text: 'Tap the mic to say book names instead of typing.', type: 'hint' }
        : voice.unsupportedReason === 'insecure-context'
          ? { text: VOICE_MESSAGES['insecure-context'], type: 'hint' }
          : null

  // Books shown in canonical order with named status
  const orderedBooks = targetBooks.map(b => ({
    ...b,
    named: namedSet.has(b.name),
  }))

  const score = namedSet.size
  const timerLow  = timeRemaining <= 30 && timeRemaining > 10
  const timerDanger = timeRemaining <= 10

  return (
    <Stage>
      <div className={styles.card}>

        {/* ── Top bar ── */}
        <div className={styles.topBar}>
          <div className={`${styles.timer} ${timerLow ? styles.timerLow : ''} ${timerDanger ? styles.timerDanger : ''}`}>
            {formatTime(timeRemaining)}
          </div>
          <div className={styles.counter}>
            <span className={styles.counterNum}>{score}</span>
            <span className={styles.counterOf}> / {total}</span>
          </div>
        </div>

        {/* ── Input ── */}
        <form className={styles.inputRow} onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className={`${styles.input} ${shaking ? styles.inputShake : ''}`}
            aria-label="Bible book name"
            placeholder="Type a Bible book name…"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="words"
            spellCheck={false}
            autoFocus
          />
          {voice.supported && (
            <button
              type="button"
              className={`${styles.micBtn} ${voice.listening ? styles.micBtnLive : ''}`}
              onClick={voice.listening ? voice.stop : voice.start}
              aria-pressed={voice.listening}
              aria-label={voice.listening ? 'Stop listening' : 'Say book names'}
              title={voice.listening ? 'Stop listening' : 'Say book names'}
            >
              🎤
            </button>
          )}
          <button type="submit" className={styles.submitBtn} aria-label="Submit answer">→</button>
        </form>

        {voiceStatus && (
          <p
            className={`${styles.voiceLine} ${voiceStatus.type === 'live' ? styles.voiceLive : ''} ${voiceStatus.type === 'error' ? styles.voiceError : ''}`}
            aria-live="polite"
          >
            {voiceStatus.text}
          </p>
        )}

        {/* Feedback */}
        <div className={styles.feedbackSlot} aria-live="polite">
          {feedback && (
            <span className={`${styles.feedback} ${feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError}`}>
              {feedback.message}
            </span>
          )}
        </div>

        {/* ── Named books grid ── */}
        <div className={styles.booksGrid}>
          {orderedBooks.map(b => (
            <span
              key={b.name}
              className={`${styles.chip} ${b.named ? styles.chipNamed : styles.chipEmpty}`}
            >
              {b.named ? b.name : '?'}
            </span>
          ))}
        </div>

        {/* Finish early */}
        <button
          type="button"
          className={styles.finishBtn}
          onClick={() => { setDone(true); onFinish([...namedSet]) }}
        >
          Finish Early
        </button>

      </div>
    </Stage>
  )
}
