import { useState, useEffect, useRef } from 'react'

/**
 * Wraps the Web Speech API (SpeechRecognition).
 * Creates a fresh instance on every start() call — required by Chrome.
 * Uses a ref for onResult to always call the latest version (no stale closures).
 */
export function useVoiceInput({ onResult }) {
  const [supported, setSupported]   = useState(false)
  const [listening, setListening]   = useState(false)
  const [error, setError]           = useState(null)
  const recognitionRef              = useRef(null)
  const onResultRef                 = useRef(onResult)

  // Keep onResult ref current every render so we never call a stale version
  useEffect(() => { onResultRef.current = onResult })

  // Detect support once on mount
  useEffect(() => {
    if (window.SpeechRecognition || window.webkitSpeechRecognition) {
      setSupported(true)
    }
  }, [])

  function start() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR || listening) return

    // Abort any leftover instance before creating a new one
    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch (_) {}
    }

    const rec = new SR()
    rec.continuous      = false
    rec.interimResults  = false
    rec.lang            = 'en-US'
    rec.maxAlternatives = 3

    rec.onresult = (event) => {
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
      setListening(false)
      if (event.error !== 'aborted') setError(event.error)
    }

    rec.onend = () => setListening(false)

    recognitionRef.current = rec

    try {
      rec.start()
      setListening(true)
    } catch {
      setListening(false)
    }
  }

  function stop() {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch (_) {}
      setListening(false)
    }
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort() } catch (_) {}
      }
    }
  }, [])

  return { supported, listening, error, start, stop }
}
