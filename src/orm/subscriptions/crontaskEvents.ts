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

let globalInitialized = false
const inflightTaskIds = new Set<string>()

export function unwrap(val: unknown): string {
  if (val == null) return ''
  const s = String(val).trim()
  if (s.startsWith('"') && s.endsWith('"')) {
    try {
      return JSON.parse(s)
    } catch {
      // fall through
    }
  }
  return s.replace(/^"|"$/g, '')
}

function fetchTaskById(taskId: string) {
  const api = useAxiosRepo(CrontaskTask).api()
  return api.fetchByID(taskId)
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

  const handler = (ev: Event) => {
    try {
      const detail = (ev as CustomEvent)?.detail as Record<string, unknown> | undefined
      const taskId = unwrap(detail?.task_id)
      if (!taskId) return
      const creator = unwrap(detail?.creator)

      if (!hasTaskInRepo(taskId) && !isKnownCreator(creator)) return

      if (inflightTaskIds.has(taskId)) return
      inflightTaskIds.add(taskId)
      fetchTaskById(taskId)
        .catch((e: unknown) => {
          console.error('[crontask.sync] fetch error', { taskId, error: e })
        })
        .finally(() => inflightTaskIds.delete(taskId))
    } catch (e) {
      console.error('[crontask.sync] handler error', e)
    }
  }

  for (const name of EVENTS) globalThis.addEventListener(name, handler as EventListener)
}

export function subscribeAllCrontaskEvents(
  onEvent: (detail: Record<string, unknown>) => void
): () => void {
  const handler = (ev: Event) => {
    try {
      const detail = (ev as CustomEvent)?.detail as Record<string, unknown> | undefined
      if (!detail) return
      onEvent(detail)
    } catch (e) {
      console.error('[crontask.view] handler error', e)
    }
  }
  for (const name of EVENTS) globalThis.addEventListener(name, handler as EventListener)
  return () => {
    for (const name of EVENTS) globalThis.removeEventListener(name, handler as EventListener)
  }
}
