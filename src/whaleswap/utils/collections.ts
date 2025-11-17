import { CollectionOperationError, type Collection } from '@tanstack/db'

const log = (...args: unknown[]) => {
  console.debug('[collection:upsert]', ...args)
}

export async function upsertCollectionRow<T extends object>(
  collection: Collection<T, string>,
  key: string,
  value: T
) {
  log('attempt', { id: collection.id, key })
  try {
    await collection.insert(value as T)
    log('inserted', { id: collection.id, key })
  } catch (error) {
    if (error instanceof CollectionOperationError) {
      log('update:fallback', { id: collection.id, key })
      await collection.update(key, (draft) => Object.assign(draft, value))
    } else {
      log('error', { id: collection.id, key, error })
      throw error
    }
  }
}

