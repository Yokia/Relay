import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { Theme } from '../types'

export interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {}
})

interface ThemeProviderProps {
  theme?: Theme
  onThemeChange?: (theme: Theme) => void
  children: React.ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  theme: propTheme,
  onThemeChange,
  children
}) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
    return propTheme || (localStorage.getItem('relay_theme') as Theme) || 'dark'
  })

  useEffect(() => {
    if (propTheme && propTheme !== currentTheme) {
      setCurrentTheme(propTheme)
      localStorage.setItem('relay_theme', propTheme)
    }
  }, [propTheme])

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', currentTheme)
    if (currentTheme === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
    }
  }, [currentTheme])

  const setTheme = (nextTheme: Theme) => {
    setCurrentTheme(nextTheme)
    localStorage.setItem('relay_theme', nextTheme)
    if (onThemeChange) {
      onThemeChange(nextTheme)
    }
  }

  const toggleTheme = () => {
    const nextTheme: Theme = currentTheme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
  }

  const value = useMemo<ThemeContextType>(
    () => ({
      theme: currentTheme,
      setTheme,
      toggleTheme
    }),
    [currentTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextType {
  return useContext(ThemeContext)
}
