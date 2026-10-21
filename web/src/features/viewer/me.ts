import { useSyncExternalStore } from 'react'

// "This is me" — which person the phone landing (ancestor view) starts from. Per browser.
const KEY = 'bayrab-me'
const listeners = new Set<() => void>()

function read(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function useMe(): [string | null, (id: string) => void] {
  const me = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    read,
  )
  return [
    me,
    (id: string) => {
      localStorage.setItem(KEY, id)
      listeners.forEach((l) => l())
    },
  ]
}
