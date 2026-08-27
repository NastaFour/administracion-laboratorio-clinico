import { create } from 'zustand'

export type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem('labcore-theme')
    if (saved === 'light' || saved === 'dark') {
      return saved
    }
  } catch {
    // ignore
  }
  return 'light'
}

function applyTheme(theme: Theme) {
  if (typeof document !== 'undefined') {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: getInitialTheme(),
  setTheme: (theme) => {
    try {
      localStorage.setItem('labcore-theme', theme)
    } catch {
      // ignore
    }
    applyTheme(theme)
    set({ theme })
  },
  toggleTheme: () => {
    set((state) => {
      const nextTheme = state.theme === 'light' ? 'dark' : 'light'
      try {
        localStorage.setItem('labcore-theme', nextTheme)
      } catch {
        // ignore
      }
      applyTheme(nextTheme)
      return { theme: nextTheme }
    })
  },
}))

// Apply on initial module load
if (typeof window !== 'undefined') {
  applyTheme(getInitialTheme())
}
