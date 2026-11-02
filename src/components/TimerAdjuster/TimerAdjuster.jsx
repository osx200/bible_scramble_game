import { useGame } from '../../context/GameContext.jsx'
import { DIFFICULTY_CONFIG } from '../../utils/scoring.js'
import { Field, Stepper } from '../Setup/Setup.jsx'
import styles from '../Setup/Setup.module.css'

const MIN = 5
const MAX = 120

export default function TimerAdjuster() {
  const { state, dispatch } = useGame()
  const { difficulty, customTime } = state
  const defaultTime = DIFFICULTY_CONFIG[difficulty].maxTime
  const currentTime = customTime ?? defaultTime

  // Returning to the default clears the override, so a later difficulty change still sets the time
  const set = (val) => dispatch({ type: 'SET_CUSTOM_TIME', payload: val === defaultTime ? null : val })

  return (
    <Field
      label="Seconds per round"
      hint={currentTime === defaultTime ? `The ${difficulty} default.` : (
        <>
          The {difficulty} default is {defaultTime}s.{' '}
          <button type="button" className={styles.inlineLink} onClick={() => set(defaultTime)}>Reset</button>
        </>
      )}
    >
      <Stepper label="Seconds per round" value={currentTime} onChange={set} min={MIN} max={MAX} step={5} unit="sec" />
    </Field>
  )
}
