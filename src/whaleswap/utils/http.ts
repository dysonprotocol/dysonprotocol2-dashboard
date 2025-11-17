import type { PaginationParams } from './types'

export function appendPagination(params: URLSearchParams, pagination?: PaginationParams) {
  if (!pagination) return
  if (pagination.key) params.set('pagination.key', pagination.key)
  if (pagination.limit !== undefined) params.set('pagination.limit', String(pagination.limit))
  if (pagination.offset !== undefined) params.set('pagination.offset', String(pagination.offset))
  if (pagination.countTotal) params.set('pagination.count_total', 'true')
  if (pagination.reverse) params.set('pagination.reverse', 'true')
}
