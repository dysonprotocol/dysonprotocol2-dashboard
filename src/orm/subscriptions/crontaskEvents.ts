import { useAxiosRepo } from '@pinia-orm/axios'
import { useRepo } from 'pinia-orm'
import CrontaskTask from '@/orm/models/crontask/Task'

const EVENTS = [
  'dysonprotocol.crontask.v1.EventTaskCreated',
  'dysonprotocol.crontask.v1.EventTaskExecuted',
  'dysonprotocol.crontask.v1.EventTaskFailed',
  'dysonprotocol.crontask.v1.EventTaskExpired',
  'dysonprotocol.crontask.v1.EventTaskPurged',
  'dysonprotocol.crontask.v1.EventTaskPending',
  'dysonprotocol.crontask.v1.EventTaskDeleted',
] as const

export type CrontaskEventName = (typeof EVENTS)[number]

interface CrontaskEventLike {
  type: CrontaskEventName
  detail?: Record<string, unknown>
}

interface GlobalWithEventListeners {
  addEventListener: (name: CrontaskEventName, handler: (ev: CrontaskEventLike) => void) => void
  removeEventListener: (name: CrontaskEventName, handler: (ev: CrontaskEventLike) => void) => void
}

let globalInitialized = false

export function unwrap(val: unknown): string {
  if (val == null) return ''
  const s = String(val).trim()
  if (s.startsWith('"') && s.endsWith('"')) {
    try {
      return JSON.parse(s)
    } catch {
      // fall through
      console.error('[crontask.sync] unwrap error', s)
    }
  }
  return s.replace(/^"|"$/g, '')
}

function fetchTaskById(taskId: string) {
  const api = useAxiosRepo(CrontaskTask).api()
  // add cache-busting query to always fetch fresh data on event
  return api.fetchByID(`${taskId}?_cb=${Date.now()}`)
}

function hasTaskInRepo(taskId: string): boolean {
  const repo = useRepo(CrontaskTask)
  return !!repo.find(String(taskId))
}

export function ensureGlobalCrontaskEventSync(args: {
  isKnownCreator: (address: string) => boolean
}): void {
  if (globalInitialized) return
  globalInitialized = true
  const { isKnownCreator } = args

  const handler = (ev: CrontaskEventLike) => {
    try {
      const detail = ev.detail || undefined
      const taskId = unwrap(detail?.task_id)
      if (!taskId) return
      const creator = unwrap(detail?.creator)

      if (!hasTaskInRepo(taskId) && !isKnownCreator(creator)) return

      // log the task id and event for debugging
      console.log('[crontask.sync] task id event', { taskId, creator, event: ev.type })

      fetchTaskById(taskId).catch((e: unknown) => {
        console.error('[crontask.sync] fetch error', { taskId, error: e })
      })
    } catch (e) {
      console.error('[crontask.sync] handler error', e)
    }
  }

  const g = globalThis as unknown as GlobalWithEventListeners
  for (const name of EVENTS) g.addEventListener(name, handler)
}

export function subscribeAllCrontaskEvents(
  onEvent: (name: CrontaskEventName, detail: Record<string, unknown>) => void
): () => void {
  const handler = (ev: CrontaskEventLike) => {
    try {
      const detail = ev.detail || undefined
      if (!detail) return
      onEvent(ev.type, detail)
    } catch (e) {
      console.error('[crontask.view] handler error', e)
    }
  }
  const g = globalThis as unknown as GlobalWithEventListeners
  for (const name of EVENTS) g.addEventListener(name, handler)
  return () => {
    for (const name of EVENTS) g.removeEventListener(name, handler)
  }
}
