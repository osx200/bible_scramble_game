import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Wraps the Web Speech API (SpeechRecognition).
 *
 * Notes on the browser API, all of which this hook works around:
 * - A fresh instance is required on every start() — reusing one silently fails in Chrome.
 * - The engine cannot start while the mic permission prompt is open, so permission is
 *   requested up front with getUserMedia and awaited before recognition begins.
 * - Recognition needs a secure context. Served over plain http:// (not localhost) the
 *   constructor exists but the engine never gets audio, which looks like "voice is broken".
 * - Browsers without Google's speech backend (e.g. Brave) fire error 'network', or never
 *   report a start at all — the watchdog below catches the second case.
 *
 * onResult receives the engine's ranked alternatives as a string[].
 */

// The engine should report onstart within a moment of a granted permission.
const ENGINE_START_TIMEOUT = 6000
// Absolute cap so a wedged engine can never leave the UI stuck in "listening".
const HARD_STOP_TIMEOUT = 25000

function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

export function useVoiceInput({ onResult, lang = 'en-US' }) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [interim,   setInterim]   = useState('')
  const [error,     setError]     = useState(null)
  // 'no-api' | 'insecure-context' | null — lets the UI explain *why* it is off
  const [unsupportedReason, setUnsupportedReason] = useState(null)

  const recognitionRef = useRef(null)
  const onResultRef    = useRef(onResult)
  const listeningRef   = useRef(false)
  const startingRef    = useRef(false)   // guards the await below against double-clicks
  const manualStopRef  = useRef(false)
  const startTimerRef  = useRef(null)
  const hardTimerRef   = useRef(null)
  const mountedRef     = useRef(true)

  // Keep onResult ref current on every render — no stale closures
  useEffect(() => { onResultRef.current = onResult })

  // Detect API support on mount. An insecure origin can construct the object but
  // never gets microphone audio, so it does not count as supported.
  useEffect(() => {
    if (!getSpeechRecognition())   { setUnsupportedReason('no-api'); return }
    if (!window.isSecureContext)   { setUnsupportedReason('insecure-context'); return }
    setUnsupportedReason(null)
    setSupported(true)
  }, [])

  const clearTimers = useCallback(() => {
    clearTimeout(startTimerRef.current)
    clearTimeout(hardTimerRef.current)
    startTimerRef.current = null
    hardTimerRef.current  = null
  }, [])

  const finish = useCallback((nextError) => {
    clearTimers()
    listeningRef.current = false
    startingRef.current  = false
    if (!mountedRef.current) return
    setListening(false)
    setInterim('')
    if (nextError !== undefined) setError(nextError)
  }, [clearTimers])

  const start = useCallback(async () => {
    const SR = getSpeechRecognition()
    if (!SR || listeningRef.current || startingRef.current) return
    startingRef.current = true

    setError(null)
    setInterim('')
    manualStopRef.current = false

    if (!window.isSecureContext) {
      startingRef.current = false
      setError('insecure-context')
      return
    }

    // Tear down anything left over from a previous attempt
    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch (_) {}
      recognitionRef.current = null
    }
    clearTimers()

    // Resolve the permission prompt before starting the engine: recognition
    // started behind an open prompt just sits there and times out.
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach(t => t.stop())
      } catch (err) {
        startingRef.current = false
        if (!mountedRef.current) return
        setError(err?.name === 'NotAllowedError' || err?.name === 'SecurityError'
          ? 'not-allowed'
          : 'no-microphone')
        return
      }
    }
    if (!mountedRef.current || listeningRef.current) { startingRef.current = false; return }

    const rec = new SR()
    rec.continuous      = false
    rec.interimResults  = true   // live text in the box while the player speaks
    rec.lang            = lang
    rec.maxAlternatives = 5      // extra alternatives feed the book matcher

    let engineStarted   = false
    let resultDelivered = false
    let sawError        = false

    const engineIsUp = () => {
      engineStarted = true
      clearTimeout(startTimerRef.current)
      startTimerRef.current = null
    }

    rec.onstart      = engineIsUp
    rec.onaudiostart = engineIsUp

    rec.onresult = (event) => {
      engineIsUp()
      const finals = []
      let interimText = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          for (let j = 0; j < result.length; j++) {
            const text = result[j].transcript.trim()
            if (text) finals.push(text)
          }
        } else {
          interimText += result[0].transcript
        }
      }

      if (!finals.length) {
        if (mountedRef.current) setInterim(interimText.trim())
        return
      }

      resultDelivered = true
      finish(null)
      try { rec.stop() } catch (_) {}
      onResultRef.current(finals)
    }

    rec.onerror = (event) => {
      // 'aborted' is our own cancellation — never surface it as a failure
      if (event.error === 'aborted') { finish(undefined); return }
      sawError = true

      const mapped =
        event.error === 'not-allowed' || event.error === 'service-not-allowed' ? 'not-allowed'
        : event.error === 'no-speech'     ? 'no-speech'
        : event.error === 'audio-capture' ? 'no-microphone'
        : event.error === 'network'       ? 'service-unavailable'
        : event.error

      finish(mapped)
    }

    rec.onend = () => {
      if (resultDelivered || sawError) { finish(undefined); return }
      // Ended without a transcript: silence if the engine ran, otherwise the
      // browser has no working speech backend.
      if (manualStopRef.current) finish(undefined)
      else finish(engineStarted ? 'no-speech' : 'service-unavailable')
    }

    recognitionRef.current = rec

    try {
      rec.start()
    } catch (_) {
      // Chrome throws InvalidStateError if a previous session is still closing
      finish('start-failed')
      return
    }

    startingRef.current  = false
    listeningRef.current = true
    setListening(true)

    // Nothing at all from the engine → no usable speech backend (Brave, etc.)
    startTimerRef.current = setTimeout(() => {
      if (engineStarted) return
      try { rec.abort() } catch (_) {}
      finish('service-unavailable')
    }, ENGINE_START_TIMEOUT)

    // Safety net: never leave the UI listening forever
    hardTimerRef.current = setTimeout(() => {
      try { rec.stop() } catch (_) {}
      finish(undefined)
    }, HARD_STOP_TIMEOUT)
  }, [clearTimers, finish, lang])

  const stop = useCallback(() => {
    manualStopRef.current = true
    const rec = recognitionRef.current
    if (rec) {
      try { rec.stop() } catch (_) {}
    }
    finish(undefined)
  }, [finish])

  // Clean up on unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      clearTimeout(startTimerRef.current)
      clearTimeout(hardTimerRef.current)
      if (recognitionRef.current) {
        try { recognitionRef.current.abort() } catch (_) {}
      }
    }
  }, [])

  return { supported, unsupportedReason, listening, interim, error, start, stop }
}
