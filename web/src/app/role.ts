import { useSyncExternalStore } from 'react'

// Prototype role switch (FR-049): which role the tester is trying. A testing aid, not access control.
// With the backend this becomes the signed-in user's role on the tree (FR-024).
export type Role = 'admin' | 'member'

const KEY = 'bayrab-role'
const listeners = new Set<() => void>()
let current = getRole()

export function getRole(): Role {
  try {
    return localStorage.getItem(KEY) === 'member' ? 'member' : 'admin'
  } catch {
    return 'admin'
  }
}

export function setRole(role: Role) {
  try {
    localStorage.setItem(KEY, role)
  } catch {
    // Storage blocked: the choice lasts until reload.
  }
  current = role
  listeners.forEach((l) => l())
}

export function useRole(): Role {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
  )
}

export const canEdit = (role: Role) => role === 'admin'
