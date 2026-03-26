import { useState } from 'react'
import { useGame } from '../../context/GameContext.jsx'
import Button from '../shared/Button.jsx'
import styles from './TeamRegister.module.css'

const DEFAULT_COLORS = ['#4A6FA5', '#E74C3C', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C']
const MAX_TEAMS = 6
const MIN_TEAMS = 2

function makeTeam(index) {
  return { id: crypto.randomUUID(), name: `Team ${index + 1}`, color: DEFAULT_COLORS[index] }
}

export default function TeamRegister() {
  const { dispatch } = useGame()
  const [teams, setTeams] = useState([makeTeam(0), makeTeam(1)])
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
    setTeams((prev) => [...prev, makeTeam(prev.length)])
  }

  function removeTeam(id) {
    if (teams.length <= MIN_TEAMS) return
    setTeams((prev) => prev.filter((t) => t.id !== id))
  }

  function handleStart() {
    const blanks = teams.filter((t) => !t.name.trim())
    if (blanks.length > 0) {
      setError('All teams need a name.')
      return
    }
    const dupes = new Set(teams.map((t) => t.name.trim().toLowerCase()))
    if (dupes.size !== teams.length) {
      setError('Team names must be unique.')
      return
    }
    dispatch({ type: 'SET_TEAMS', payload: teams.map((t) => ({ ...t, name: t.name.trim() })) })
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.emoji}>👥</div>
          <h1 className={styles.title}>Register Teams</h1>
          <p className={styles.subtitle}>
            {MIN_TEAMS}–{MAX_TEAMS} teams · Each team plays {10} rounds
          </p>
        </div>

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
                />
              </div>

              <input
                className={styles.teamInput}
                type="text"
                maxLength={24}
                placeholder={`Team ${i + 1} name`}
                value={team.name}
                onChange={(e) => updateName(team.id, e.target.value)}
              />

              <button
                className={styles.removeBtn}
                onClick={() => removeTeam(team.id)}
                disabled={teams.length <= MIN_TEAMS}
                title="Remove team"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <button
          className={styles.addBtn}
          onClick={addTeam}
          disabled={teams.length >= MAX_TEAMS}
        >
          + Add Team {teams.length < MAX_TEAMS ? `(${MAX_TEAMS - teams.length} more allowed)` : '(max reached)'}
        </button>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.divider} />

        <div className={styles.actions}>
          <Button full size="lg" onClick={handleStart}>
            Start Tournament
          </Button>
          <Button full variant="ghost" onClick={() => dispatch({ type: 'RESTART' })}>
            Back to Menu
          </Button>
        </div>
      </div>
    </div>
  )
}
