import React, { createContext, useContext, useReducer } from 'react'
import { DIFFICULTY_CONFIG, calculatePoints } from '../utils/scoring.js'
import { selectBooks } from '../utils/bookFilter.js'
import { scrambleName } from '../utils/scramble.js'

const GameContext = createContext(null)

const initialState = {
  // ── Settings ──────────────────────────────────────────────
  phase: 'menu',   // menu | team-register | team-transition | playing | team-results | gameOver
  mode: 'solo',
  difficulty: 'easy',
  category: 'all',
  customTime: null,

  // ── Team state ────────────────────────────────────────────
  teams: [],          // [{ id, name, color }]  — identity only
  // teamStates: per-team mutable state, built at SET_TEAMS, updated each turn
  // [{ teamId, name, color, score, streak, bestStreak, roundsPlayed, roundResults, books }]
  teamStates: [],
  roundsPerTeam: 10,
  currentTeamIndex: 0,
  lastRoundResult: null,  // { correct, pointsEarned, bookName, teamName, teamColor } shown on transition
  _pendingTeamNext: null, // stores next-team data while feedback overlay is visible

  // ── Solo round state ──────────────────────────────────────
  books: [],
  currentBook: null,
  scrambledName: '',
  roundNumber: 0,
  totalRounds: 10,
  timeRemaining: 45,
  maxTime: 45,

  // ── Hints ─────────────────────────────────────────────────
  hintsUsed: 0,
  revealedHints: [],

  // ── Scoring (active player/team) ──────────────────────────
  score: 0,
  streak: 0,
  bestStreak: 0,
  roundResults: [],

  // ── Feedback ──────────────────────────────────────────────
  lastResult: null,

  // ── Pause ─────────────────────────────────────────────────
  paused: false,
}

// ── Helpers ────────────────────────────────────────────────

function buildSoloRound(state) {
  const { difficulty, category, customTime } = state
  const config = DIFFICULTY_CONFIG[difficulty]
  const resolvedTime = customTime ?? config.maxTime
  const books = selectBooks({ difficulty, category, count: config.totalRounds })
  const firstBook = books[0] ?? null
  return {
    books,
    currentBook: firstBook,
    scrambledName: firstBook ? scrambleName(firstBook.name) : '',
    roundNumber: 1,
    totalRounds: books.length,
    timeRemaining: resolvedTime,
    maxTime: resolvedTime,
    score: 0,
    streak: 0,
    bestStreak: 0,
    roundResults: [],
    hintsUsed: 0,
    revealedHints: [],
    lastResult: null,
  }
}

function buildTeamStates(teams, difficulty, category, roundsPerTeam) {
  return teams.map((team) => ({
    teamId: team.id,
    name: team.name,
    color: team.color,
    score: 0,
    streak: 0,
    bestStreak: 0,
    roundsPlayed: 0,
    roundResults: [],
    // Pre-select all books for this team so no repeats across their turns
    books: selectBooks({ difficulty, category, count: roundsPerTeam }),
  }))
}

// Find next team index that still has rounds to play (wraps around)
function findNextTeamIndex(teamStates, currentIndex, roundsPerTeam) {
  const n = teamStates.length
  for (let i = 1; i <= n; i++) {
    const idx = (currentIndex + i) % n
    if (teamStates[idx].roundsPlayed < roundsPerTeam) return idx
  }
  return -1 // all done
}

// ── Reducer ────────────────────────────────────────────────

function resolveNextRound(state, result, isCorrect) {
  const { mode, roundNumber, totalRounds, books, score, streak, roundResults, bestStreak, maxTime } = state
  const newStreak = isCorrect ? streak + 1 : 0
  const newScore = score + result.pointsEarned
  const newBestStreak = Math.max(bestStreak, newStreak)
  const newRoundResults = [...roundResults, result]
  const lastResult = { correct: isCorrect, pointsEarned: result.pointsEarned, bookName: result.book.name }

  // ── Teams alternating mode ──────────────────────────────
  if (mode === 'teams') {
    const { teamStates, currentTeamIndex, roundsPerTeam, teams } = state
    const currentTeam = teams[currentTeamIndex]

    const updatedTeamStates = teamStates.map((ts, i) => {
      if (i !== currentTeamIndex) return ts
      return {
        ...ts,
        score: newScore,
        streak: newStreak,
        bestStreak: newBestStreak,
        roundsPlayed: ts.roundsPlayed + 1,
        roundResults: newRoundResults,
      }
    })

    const allDone = updatedTeamStates.every((ts) => ts.roundsPlayed >= roundsPerTeam)
    const nextTeamIndex = allDone ? -1 : findNextTeamIndex(updatedTeamStates, currentTeamIndex, roundsPerTeam)

    // Stay in 'playing' so RoundFeedback overlay can display for 1.5s.
    // CLEAR_LAST_RESULT will pick up _pendingTeamNext and apply the real transition.
    return {
      ...state,
      score: newScore,
      streak: newStreak,
      bestStreak: newBestStreak,
      roundResults: newRoundResults,
      lastResult,
      timeRemaining: -1,  // freeze timer so it doesn't tick or fire TIME_UP
      _pendingTeamNext: {
        teamStates: updatedTeamStates,
        nextTeamIndex,
        allDone,
        lastRoundResult: {
          correct: isCorrect,
          pointsEarned: result.pointsEarned,
          bookName: result.book.name,
          teamName: currentTeam.name,
          teamColor: currentTeam.color,
        },
      },
    }
  }

  // ── Solo mode ───────────────────────────────────────────
  if (roundNumber >= totalRounds) {
    return {
      ...state,
      score: newScore,
      streak: newStreak,
      bestStreak: newBestStreak,
      roundResults: newRoundResults,
      lastResult,
      phase: 'gameOver',
    }
  }

  const nextRoundNumber = roundNumber + 1
  const nextBook = books[nextRoundNumber - 1] ?? null
  return {
    ...state,
    score: newScore,
    streak: newStreak,
    bestStreak: newBestStreak,
    roundResults: newRoundResults,
    lastResult,
    roundNumber: nextRoundNumber,
    currentBook: nextBook,
    scrambledName: nextBook ? scrambleName(nextBook.name) : '',
    timeRemaining: maxTime,
    hintsUsed: 0,
    revealedHints: [],
  }
}

function reducer(state, action) {
  switch (action.type) {

    case 'SET_MODE':       return { ...state, mode: action.payload }
    case 'SET_DIFFICULTY': return { ...state, difficulty: action.payload }
    case 'SET_CATEGORY':   return { ...state, category: action.payload }
    case 'SET_CUSTOM_TIME':return { ...state, customTime: action.payload }

    // ── Solo ────────────────────────────────────────────────
    case 'START_GAME': {
      const round = buildSoloRound(state)
      return {
        ...initialState,
        mode: 'solo',
        difficulty: state.difficulty,
        category: state.category,
        customTime: state.customTime,
        phase: 'playing',
        paused: false,
        ...round,
      }
    }

    // ── Team setup ──────────────────────────────────────────
    case 'GO_TEAM_REGISTER':
      return { ...state, phase: 'team-register' }

    case 'SET_TEAMS': {
      // payload: [{ id, name, color }]
      const { difficulty, category, customTime } = state
      const config = DIFFICULTY_CONFIG[difficulty]
      const roundsPerTeam = config.totalRounds
      const teamStates = buildTeamStates(action.payload, difficulty, category, roundsPerTeam)
      return {
        ...state,
        teams: action.payload,
        teamStates,
        roundsPerTeam,
        currentTeamIndex: 0,
        lastRoundResult: null,
        phase: 'team-transition',
      }
    }

    case 'START_TEAM_TURN': {
      // One round for the current team
      const { teamStates, currentTeamIndex, difficulty, customTime } = state
      const config = DIFFICULTY_CONFIG[difficulty]
      const resolvedTime = customTime ?? config.maxTime
      const ts = teamStates[currentTeamIndex]
      const book = ts.books[ts.roundsPlayed] ?? ts.books[0]

      return {
        ...state,
        phase: 'playing',
        currentBook: book,
        scrambledName: scrambleName(book.name),
        // roundNumber / totalRounds used for display in GameBoard
        roundNumber: ts.roundsPlayed + 1,
        totalRounds: state.roundsPerTeam,
        timeRemaining: resolvedTime,
        maxTime: resolvedTime,
        // Restore this team's running score/streak
        score: ts.score,
        streak: ts.streak,
        bestStreak: ts.bestStreak,
        roundResults: ts.roundResults,
        hintsUsed: 0,
        revealedHints: [],
        lastResult: null,
        paused: false,
      }
    }

    case 'REPLAY_TEAMS': {
      // Same teams, new books, reset scores
      const { teams, difficulty, category } = state
      const config = DIFFICULTY_CONFIG[difficulty]
      const roundsPerTeam = config.totalRounds
      const teamStates = buildTeamStates(teams, difficulty, category, roundsPerTeam)
      return {
        ...state,
        teamStates,
        roundsPerTeam,
        currentTeamIndex: 0,
        lastRoundResult: null,
        _pendingTeamNext: null,
        phase: 'team-transition',
      }
    }

    // ── Gameplay ────────────────────────────────────────────
    case 'SUBMIT_ANSWER': {
      const { answer } = action.payload
      const { currentBook, difficulty, timeRemaining, maxTime, hintsUsed, streak } = state
      if (!currentBook) return state
      const correct = answer.trim().toLowerCase() === currentBook.name.toLowerCase()
      const pointsEarned = correct
        ? calculatePoints({ difficulty, timeRemaining, maxTime, hintsUsed, streak })
        : 0
      const result = { book: currentBook, correct, pointsEarned, timeUsed: maxTime - timeRemaining }
      return resolveNextRound(state, result, correct)
    }

    case 'TIME_UP': {
      const { currentBook } = state
      if (!currentBook) return state
      const result = { book: currentBook, correct: false, pointsEarned: 0, timeUsed: state.maxTime }
      return resolveNextRound(state, result, false)
    }

    case 'TICK_TIMER':
      if (state.timeRemaining <= 0) return state
      return { ...state, timeRemaining: state.timeRemaining - 1 }

    case 'USE_HINT': {
      const { hintType } = action.payload
      if (state.revealedHints.includes(hintType)) return state
      return { ...state, hintsUsed: state.hintsUsed + 1, revealedHints: [...state.revealedHints, hintType] }
    }

    case 'TOGGLE_PAUSE':
      if (state.phase !== 'playing') return state
      return { ...state, paused: !state.paused }

    case 'SKIP_BOOK': {
      const { currentBook, maxTime, timeRemaining, paused } = state
      if (!currentBook || paused) return state
      const result = { book: currentBook, correct: false, pointsEarned: 0, timeUsed: maxTime - timeRemaining, skipped: true }
      return resolveNextRound(state, result, false)
    }

    case 'CLEAR_LAST_RESULT': {
      if (state._pendingTeamNext) {
        const { teamStates, nextTeamIndex, allDone, lastRoundResult } = state._pendingTeamNext
        return {
          ...state,
          lastResult: null,
          _pendingTeamNext: null,
          teamStates,
          lastRoundResult,
          currentTeamIndex: allDone ? state.currentTeamIndex : nextTeamIndex,
          phase: allDone ? 'team-results' : 'team-transition',
        }
      }
      return { ...state, lastResult: null }
    }

    case 'RESTART':
      return {
        ...initialState,
        difficulty: state.difficulty,
        category: state.category,
        customTime: state.customTime,
        mode: state.mode,
      }

    default:
      return state
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}
