import { createContext, useContext, useState } from 'react'
import { track } from '../utils/analytics.js'

const AppModeContext = createContext(null)

/** A shared invitation link (/join/CODE) opens straight into multiplayer */
export function joinCodeFromUrl() {
  const m = window.location.pathname.match(/^\/join\/([A-Za-z0-9-]{4,20})\/?$/)
  return m ? m[1].toUpperCase() : null
}

export function AppModeProvider({ children }) {
  // 'scramble' | 'quiz' | 'moderator' | 'recall' | 'multiplayer'
  const [appMode, setAppModeState] = useState(() => (joinCodeFromUrl() ? 'multiplayer' : 'scramble'))
  // Builder content handed to "Play With Others" (Host online). Session-only:
  // it lives here just long enough to create the room, then on the server.
  const [multiplayerLaunch, setMultiplayerLaunch] = useState(null)

  function setAppMode(mode) {
    // Leaving multiplayer drops the /join/CODE address so a refresh lands on the menu
    if (mode !== 'multiplayer' && window.location.pathname !== '/') window.history.replaceState(null, '', '/')
    if (mode !== 'multiplayer') setMultiplayerLaunch(null)
    // 'scramble' is also the way back to the menu, so it's counted where its
    // tile opens (Menu) instead of here
    if (mode !== 'scramble') track('mode_open', mode)
    setAppModeState(mode)
  }

  function launchMultiplayer(payload) {
    setMultiplayerLaunch(payload)
    setAppModeState('multiplayer')
  }

  return (
    <AppModeContext.Provider value={{ appMode, setAppMode, multiplayerLaunch, launchMultiplayer }}>
      {children}
    </AppModeContext.Provider>
  )
}

export function useAppMode() {
  return useContext(AppModeContext)
}
