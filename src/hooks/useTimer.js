import { useEffect, useRef } from 'react'
import { useGame } from '../context/GameContext.jsx'

/**
 * Drives the countdown by dispatching TICK_TIMER every second.
 * Dispatches TIME_UP when timeRemaining hits 0.
 * Restarts when roundNumber changes.
 */
export function useTimer() {
  const { state, dispatch } = useGame()
  const { phase, timeRemaining, roundNumber, paused } = state
  const intervalRef = useRef(null)

  useEffect(() => {
    if (phase !== 'playing' || paused) {
      clearInterval(intervalRef.current)
      return
    }

    intervalRef.current = setInterval(() => {
      dispatch({ type: 'TICK_TIMER' })
    }, 1000)

    return () => clearInterval(intervalRef.current)
  }, [phase, roundNumber, paused]) // restart interval on each new round or pause toggle

  useEffect(() => {
    if (phase === 'playing' && !paused && timeRemaining === 0) {
      clearInterval(intervalRef.current)
      dispatch({ type: 'TIME_UP' })
    }
  }, [timeRemaining, phase, paused])
}
