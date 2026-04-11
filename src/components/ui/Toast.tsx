'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

type ToastVariant = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const toast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = `${Date.now()}-${Math.random()}`
    setItems((prev) => [...prev, { id, message, variant }])
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed top-[calc(env(safe-area-inset-top)+12px)] left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center w-full px-4 pointer-events-none"
      >
        {items.map((item) => (
          <Toast key={item.id} item={item} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function Toast({ item }: { item: ToastItem }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Trigger enter animation
    const t = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(t)
  }, [])

  const bg =
    item.variant === 'success'
      ? 'bg-emerald-600'
      : item.variant === 'error'
      ? 'bg-error-container border border-error/30'
      : 'bg-surface-container-highest border-2 border-outline-variant'

  const icon =
    item.variant === 'success'
      ? 'check_circle'
      : item.variant === 'error'
      ? 'error'
      : 'info'

  const textColor =
    item.variant === 'success' || item.variant === 'error'
      ? 'text-white'
      : 'text-on-surface'

  return (
    <div
      className={`
        flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl max-w-sm w-full
        transition-all duration-300 pointer-events-auto
        ${bg} ${textColor}
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
      `}
    >
      <span className="material-symbols-outlined text-xl flex-shrink-0">{icon}</span>
      <p className="text-sm font-medium leading-snug">{item.message}</p>
    </div>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
