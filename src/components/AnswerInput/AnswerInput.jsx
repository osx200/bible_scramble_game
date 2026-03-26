import { useState, useRef, useEffect } from 'react'
import { useVoiceInput } from '../../hooks/useVoiceInput.js'
import Button from '../shared/Button.jsx'
import styles from './AnswerInput.module.css'

export default function AnswerInput({ roundKey, onSubmit, disabled }) {
  const [value, setValue]       = useState('')
  const [shaking, setShaking]   = useState(false)
  const inputRef                = useRef(null)

  // Reset + focus on each new round
  useEffect(() => {
    setValue('')
    if (!disabled) inputRef.current?.focus()
  }, [roundKey])

  function handleSubmit(answer) {
    if (disabled) return
    const trimmed = (answer ?? value).trim()
    if (!trimmed) {
      setShaking(true)
      setTimeout(() => setShaking(false), 450)
      return
    }
    onSubmit(trimmed)
    setValue('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSubmit()
  }

  // Voice — auto-submit when recognised
  const { supported: voiceSupported, listening, error: voiceError, start, stop } = useVoiceInput({
    onResult: (transcript) => {
      setValue(transcript)
      // Small delay so user sees what was heard before submitting
      setTimeout(() => handleSubmit(transcript), 400)
    },
  })

  const micTitle = listening
    ? 'Listening… click to cancel'
    : voiceError === 'not-allowed'
    ? 'Microphone permission denied'
    : 'Click to speak your answer'

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <input
          ref={inputRef}
          type="text"
          className={`${styles.input} ${shaking ? styles.shake : ''}`}
          placeholder={listening ? 'Listening…' : 'Type the book name…'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          disabled={disabled || listening}
        />

        {/* Mic button — always visible; disabled with tooltip when unsupported */}
        <button
          className={`${styles.micBtn} ${listening ? styles.micListening : ''} ${voiceError === 'not-allowed' ? styles.micDenied : ''} ${!voiceSupported ? styles.micUnsupported : ''}`}
          onClick={listening ? stop : start}
          disabled={disabled || !voiceSupported}
          title={!voiceSupported ? 'Voice input not supported in this browser (try Chrome or Edge)' : micTitle}
          aria-label={!voiceSupported ? 'Voice input not supported' : micTitle}
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
          <span className={styles.voiceDot} /> Say the name of the Bible book…
        </p>
      ) : voiceError && voiceError !== 'aborted' ? (
        <p className={styles.voiceError}>
          {voiceError === 'not-allowed'
            ? '🚫 Microphone access denied — click the 🔒 lock icon in the address bar and allow microphone.'
            : voiceError === 'no-speech'
            ? '🎤 No speech detected — try again.'
            : voiceError === 'brave-blocked'
            ? '🦁 Voice input requires Chrome or Edge — Brave does not support this API.'
            : `Voice error: ${voiceError}`}
        </p>
      ) : (
        <p className={styles.hint}>
          Press <kbd className={styles.kbd}>Enter</kbd> to submit · not case-sensitive · numbers required (e.g. <em>1 Samuel</em>)
          {voiceSupported ? <span> · tap 🎤 to speak (Chrome/Edge only)</span> : <span> · 🎤 voice requires Chrome or Edge</span>}
        </p>
      )}
    </div>
  )
}
