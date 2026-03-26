import { createContext, useContext, useState } from 'react'

const AppModeContext = createContext(null)

export function AppModeProvider({ children }) {
  const [appMode, setAppMode] = useState('scramble') // 'scramble' | 'quiz'
  return (
    <AppModeContext.Provider value={{ appMode, setAppMode }}>
      {children}
    </AppModeContext.Provider>
  )
}

export function useAppMode() {
  return useContext(AppModeContext)
}
