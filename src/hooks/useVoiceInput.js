import { useState, useEffect, useRef } from 'react'

/**
 * Wraps the Web Speech API (SpeechRecognition).
 * Creates a fresh instance on every start() call — required by Chrome/Brave.
 * Uses a ref for onResult to avoid stale closures.
 * Includes a timeout to detect when Brave silently blocks the API.
 */
export function useVoiceInput({ onResult }) {
  const [supported, setSupported]   = useState(false)
  const [listening, setListening]   = useState(false)
  const [error, setError]           = useState(null)
  const recognitionRef              = useRef(null)
  const onResultRef                 = useRef(onResult)
  const timeoutRef                  = useRef(null)

  // Keep onResult ref current on every render — no stale closures
  useEffect(() => { onResultRef.current = onResult })

  // Detect API support on mount
  useEffect(() => {
    if (window.SpeechRecognition || window.webkitSpeechRecognition) {
      setSupported(true)
    }
  }, [])

  function start() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR || listening) return

    // Abort any leftover instance
    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch (_) {}
    }
    clearTimeout(timeoutRef.current)

    const rec = new SR()
    rec.continuous      = false
    rec.interimResults  = false
    rec.lang            = 'en-US'
    rec.maxAlternatives = 3

    rec.onresult = (event) => {
      clearTimeout(timeoutRef.current)
      const transcripts = []
      for (let i = 0; i < event.results.length; i++) {
        for (let j = 0; j < event.results[i].length; j++) {
          transcripts.push(event.results[i][j].transcript.trim())
        }
      }
      setListening(false)
      setError(null)
      if (transcripts.length > 0) onResultRef.current(transcripts[0])
    }

    rec.onerror = (event) => {
      clearTimeout(timeoutRef.current)
      setListening(false)
      if (event.error === 'not-allowed') {
        setError('not-allowed')
      } else if (event.error === 'no-speech') {
        setError('no-speech')
      } else if (event.error !== 'aborted') {
        setError(event.error)
      }
    }

    rec.onend = () => {
      clearTimeout(timeoutRef.current)
      setListening(false)
    }

    recognitionRef.current = rec

    try {
      rec.start()
      setListening(true)

      // If no result or error within 5s, the browser is silently blocking (Brave without Google API key)
      timeoutRef.current = setTimeout(() => {
        try { rec.abort() } catch (_) {}
        setListening(false)
        setError('brave-blocked')
      }, 5000)

    } catch {
      setListening(false)
      setError('brave-blocked')
    }
  }

  function stop() {
    clearTimeout(timeoutRef.current)
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch (_) {}
      setListening(false)
    }
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearTimeout(timeoutRef.current)
      if (recognitionRef.current) {
        try { recognitionRef.current.abort() } catch (_) {}
      }
    }
  }, [])

  return { supported, listening, error, start, stop }
}
