import { useState, useEffect, useRef } from 'react'

/**
 * Wraps the Web Speech API (SpeechRecognition).
 * Returns { supported, listening, error, start, stop }.
 * onResult(transcript) is called when speech is recognised.
 */
export function useVoiceInput({ onResult }) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [error, setError]         = useState(null)
  const recognitionRef            = useRef(null)

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return  // Firefox and other unsupported browsers

    setSupported(true)

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
      if (transcripts.length > 0) onResult(transcripts[0])
    }

    rec.onerror = (event) => {
      setListening(false)
      if (event.error !== 'aborted') setError(event.error)
    }

    rec.onend = () => setListening(false)

    recognitionRef.current = rec
    return () => rec.abort()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function start() {
    if (!recognitionRef.current || listening) return
    setError(null)
    try {
      recognitionRef.current.start()
      setListening(true)
    } catch {
      // recognition already started — ignore
    }
  }

  function stop() {
    if (recognitionRef.current && listening) {
      recognitionRef.current.stop()
      setListening(false)
    }
  }

  return { supported, listening, error, start, stop }
}
