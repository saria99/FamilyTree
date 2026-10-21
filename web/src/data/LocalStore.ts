import type { TreeData } from './model'
import { createSampleFamily } from './sampleFamily'

// Phase 0 data source: the whole tree lives in memory, mirrored to localStorage, with undo/redo.
// Phase 3+ adds ApiStore behind the same React hooks (see plan.md, "DataSource").

const STORAGE_KEY = 'bayrab-prototype-v1'
const HISTORY_LIMIT = 100

interface HistoryEntry {
  label: string
  data: TreeData
}

type Listener = () => void

export interface StoreSnapshot {
  data: TreeData
  canUndo: boolean
  canRedo: boolean
  undoLabel?: string
  redoLabel?: string
}

export class LocalStore {
  private data: TreeData
  private past: HistoryEntry[] = []
  private future: HistoryEntry[] = []
  private listeners = new Set<Listener>()
  private snapshot: StoreSnapshot

  constructor() {
    this.data = this.read() ?? createSampleFamily()
    this.snapshot = this.makeSnapshot()
  }

  subscribe = (listener: Listener) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = () => this.snapshot

  commit(label: string, next: TreeData) {
    this.past = [...this.past.slice(-HISTORY_LIMIT + 1), { label, data: this.data }]
    this.future = []
    this.set(next)
  }

  undo = () => {
    const entry = this.past.at(-1)
    if (!entry) return
    this.past = this.past.slice(0, -1)
    this.future = [{ label: entry.label, data: this.data }, ...this.future]
    this.set(entry.data)
  }

  redo = () => {
    const entry = this.future[0]
    if (!entry) return
    this.future = this.future.slice(1)
    this.past = [...this.past, { label: entry.label, data: this.data }]
    this.set(entry.data)
  }

  /** Replace everything (Reset demo / Open JSON file). Undoable. */
  replace(label: string, next: TreeData) {
    this.commit(label, next)
  }

  private set(next: TreeData) {
    this.data = next
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Storage full or disabled (private mode): keep working in memory.
    }
    this.snapshot = this.makeSnapshot()
    this.listeners.forEach((l) => l())
  }

  private makeSnapshot(): StoreSnapshot {
    return {
      data: this.data,
      canUndo: this.past.length > 0,
      canRedo: this.future.length > 0,
      undoLabel: this.past.at(-1)?.label,
      redoLabel: this.future[0]?.label,
    }
  }

  private read(): TreeData | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw) as TreeData
      return parsed.format === 'bayrab-prototype' && parsed.version === 1 ? parsed : null
    } catch {
      return null
    }
  }
}
