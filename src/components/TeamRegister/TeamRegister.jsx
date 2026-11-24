import { useState } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import { usePlayer } from '../../context/PlayerContext.jsx'
import { SetupScreen } from '../Setup/Setup.jsx'
import { GroupNameSelect, freeGroupNames } from '../NamePicker/NamePicker.jsx'
import { isPresetName } from '../../data/presetNames.js'
import styles from './TeamRegister.module.css'
import Stage from '../Stage/Stage.jsx'

const DEFAULT_COLORS = ['#4A6FA5', '#E74C3C', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C']
const MAX_TEAMS = 6
const MIN_TEAMS = 2

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

// Team names come from the preset group list (no typing); a new team gets
// the first name no other team is using
function makeTeam(index, takenNames) {
  return { id: uid(), name: freeGroupNames(1, takenNames)[0], color: DEFAULT_COLORS[index] }
}

export default function TeamRegister() {
  const { dispatch } = useGame()
  const { profile } = usePlayer()
  // A group profile is most likely one of the teams, so start it off first
  const [teams, setTeams] = useState(() => {
    const own = profile.kind === 'group' && isPresetName(profile.name, 'group') ? [profile.name] : []
    const first = { ...makeTeam(0, []), name: own[0] ?? freeGroupNames(1)[0] }
    return [first, makeTeam(1, [first.name])]
  })
  const [error, setError] = useState('')

  function updateName(id, name) {
    setTeams((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)))
    setError('')
  }

  function updateColor(id, color) {
    setTeams((prev) => prev.map((t) => (t.id === id ? { ...t, color } : t)))
  }

  function addTeam() {
    if (teams.length >= MAX_TEAMS) return
    setTeams((prev) => [...prev, makeTeam(prev.length, prev.map((t) => t.name))])
  }

  function removeTeam(id) {
    if (teams.length <= MIN_TEAMS) return
    setTeams((prev) => prev.filter((t) => t.id !== id))
  }

  function handleStart() {
    const dupes = new Set(teams.map((t) => t.name.toLowerCase()))
    if (dupes.size !== teams.length) {
      setError('Team names must be unique.')
      return
    }
    dispatch({ type: 'SET_TEAMS', payload: teams })
  }

  return (
    <Stage art="joshua">
      <SetupScreen
        title="Name your teams"
        subtitle={`${MIN_TEAMS} to ${MAX_TEAMS} teams take turns on this screen. Pick a name for each team, and tap a colour dot to change it.`}
        onBack={() => dispatch({ type: 'RESTART' })}
        summary={`${teams.length} teams · 10 rounds each`}
        startLabel="Start tournament"
        onStart={handleStart}
        error={error}
      >

        <div className={styles.teamList}>
          {teams.map((team, i) => (
            <div key={team.id} className={styles.teamRow}>
              {/* Color picker */}
              <div className={styles.colorDot} style={{ backgroundColor: team.color }}>
                <input
                  type="color"
                  className={styles.colorPicker}
                  value={team.color}
                  onChange={(e) => updateColor(team.id, e.target.value)}
                  title="Pick team color"
                  aria-label={`Pick color for team ${i + 1}`}
                />
              </div>

              <GroupNameSelect
                className={styles.teamInput}
                aria-label={`Team ${i + 1} name`}
                value={team.name}
                taken={teams.filter((t) => t.id !== team.id).map((t) => t.name)}
                onChange={(name) => updateName(team.id, name)}
              />

              <button
                className={styles.removeBtn}
                onClick={() => removeTeam(team.id)}
                disabled={teams.length <= MIN_TEAMS}
                title="Remove team"
                aria-label={`Remove team ${i + 1}`}
                type="button"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <button
          className={styles.addBtn}
          type="button"
          onClick={addTeam}
          disabled={teams.length >= MAX_TEAMS}
        >
          + Add team {teams.length < MAX_TEAMS ? `(${MAX_TEAMS - teams.length} more allowed)` : '(max reached)'}
        </button>

      </SetupScreen>
    </Stage>
  )
}
