import { useState, useRef, useEffect } from 'react'
import { useWordSet } from '../../context/GameContext.jsx'
import { useVoiceInput } from '../../hooks/useVoiceInput.js'
import { resolveSpokenAnswer } from '../../utils/voiceMatch.js'
import Button from '../shared/Button.jsx'
import styles from './AnswerInput.module.css'

const VOICE_MESSAGES = {
  'not-allowed':        '🚫 Microphone blocked - click the 🔒 icon in the address bar and allow the microphone, then try again.',
  'no-microphone':      '🎤 No microphone found - check that one is connected and not in use by another app.',
  'insecure-context':   '🔒 Voice input needs a secure (https://) address - it is disabled on plain http.',
  'service-unavailable':'🦁 This browser has no speech service - use Chrome or Edge for voice input.',
  'start-failed':       '🎤 Voice input could not start - tap the mic to try again.',
}

export default function AnswerInput({ roundKey, onSubmit, disabled }) {
  const wordSet                 = useWordSet()
  const [value, setValue]       = useState('')
  const [shaking, setShaking]   = useState(false)
  const [heard, setHeard]       = useState(null)   // unmatched transcript awaiting confirmation
  const inputRef                = useRef(null)
  const submitTimerRef          = useRef(null)
  const shakeTimerRef           = useRef(null)

  // Reset + focus on each new round
  useEffect(() => {
    clearTimeout(submitTimerRef.current)
    setValue('')
    setHeard(null)
    if (!disabled) inputRef.current?.focus()
  }, [roundKey])

  useEffect(() => () => {
    clearTimeout(submitTimerRef.current)
    clearTimeout(shakeTimerRef.current)
  }, [])

  function handleSubmit(answer) {
    if (disabled) return
    const trimmed = (answer ?? value).trim()
    if (!trimmed) {
      setShaking(true)
      clearTimeout(shakeTimerRef.current)
      shakeTimerRef.current = setTimeout(() => setShaking(false), 450)
      return
    }
    onSubmit(trimmed)
    setValue('')
    setHeard(null)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSubmit()
  }

  // Voice — auto-submit a recognised book, otherwise hand the text back for editing
  const {
    supported: voiceSupported,
    unsupportedReason,
    listening,
    interim,
    error: voiceError,
    start,
    stop,
  } = useVoiceInput({
    onResult: (transcripts) => {
      const { text, matched, exact } = resolveSpokenAnswer(transcripts, wordSet.id)
      setValue(text)

      // Only a confident match submits itself — guessing would burn the round
      if (matched && exact) {
        setHeard(null)
        clearTimeout(submitTimerRef.current)
        // Small delay so the player sees what was heard before it submits
        submitTimerRef.current = setTimeout(() => handleSubmit(text), 500)
      } else {
        setHeard({ text, matched })
        inputRef.current?.focus()
      }
    },
  })

  const displayValue = listening && interim ? interim : value

  const micTitle = listening
    ? 'Listening… click to cancel'
    : voiceError === 'not-allowed'
    ? 'Microphone permission denied'
    : 'Click to speak your answer'

  const unsupportedTitle = unsupportedReason === 'insecure-context'
    ? 'Voice input needs an https:// address'
    : 'Voice input not supported in this browser (try Chrome or Edge)'

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <input
          ref={inputRef}
          type="text"
          className={`${styles.input} ${shaking ? styles.shake : ''}`}
          aria-label={`Your answer: the ${wordSet.noun} name`}
          placeholder={listening ? 'Listening…' : `Type the ${wordSet.noun} name…`}
          value={displayValue}
          onChange={(e) => { setValue(e.target.value); setHeard(null) }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          disabled={disabled}
          readOnly={listening}
        />

        {/* Mic button — always visible; disabled with tooltip when unsupported */}
        <button
          className={`${styles.micBtn} ${listening ? styles.micListening : ''} ${voiceError === 'not-allowed' ? styles.micDenied : ''} ${!voiceSupported ? styles.micUnsupported : ''}`}
          onClick={listening ? stop : () => { setHeard(null); start() }}
          disabled={disabled || !voiceSupported}
          title={!voiceSupported ? unsupportedTitle : micTitle}
          aria-label={!voiceSupported ? unsupportedTitle : micTitle}
          type="button"
        >
          {listening ? '⏹' : voiceError === 'not-allowed' ? '🚫' : '🎤'}
        </button>

        <Button onClick={() => handleSubmit()} className={styles.submitBtn} disabled={disabled || listening}>
          Submit
        </Button>
      </div>

      {/* Status / hint row */}
      {listening ? (
        <p className={styles.voiceStatus}>
          <span className={styles.voiceDot} />
          {interim ? `Heard: ${interim}` : `Say the name of the ${wordSet.noun}…`}
        </p>
      ) : voiceError ? (
        <p className={styles.voiceError}>
          {voiceError === 'no-speech'
            ? `🎤 Didn't catch that - tap the mic and say the ${wordSet.noun} name.`
            : VOICE_MESSAGES[voiceError] ?? `Voice error: ${voiceError}`}
        </p>
      ) : heard ? (
        <p className={styles.voiceHeard}>
          {heard.matched
            ? <>Did you mean “{heard.text}”? Press <kbd className={styles.kbd}>Enter</kbd> to submit.</>
            : <>Heard “{heard.text}” - not a {wordSet.noun} name. Edit it, or press <kbd className={styles.kbd}>Enter</kbd> to submit anyway.</>}
        </p>
      ) : (
        <p className={styles.hint}>
          Press <kbd className={styles.kbd}>Enter</kbd> to submit · not case-sensitive · {wordSet.typingHint}
          {voiceSupported
            ? <span> · tap 🎤 to speak</span>
            : unsupportedReason === 'insecure-context'
            ? <span> · 🎤 voice needs an https address</span>
            : <span> · 🎤 voice requires Chrome or Edge</span>}
        </p>
      )}
    </div>
  )
}
