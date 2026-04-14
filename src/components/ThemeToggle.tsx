'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-surface-container transition-colors active:scale-95"
      aria-label={theme === 'dark' ? 'Přepnout na světlý režim' : 'Přepnout na tmavý režim'}
    >
      {theme === 'dark'
        ? <Sun className="w-5 h-5 text-outline" />
        : <Moon className="w-5 h-5 text-outline" />
      }
    </button>
  )
}
