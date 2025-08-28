import axios from 'axios'
import { setupCache } from 'axios-cache-interceptor'

const origin = typeof window !== 'undefined' && window.location ? window.location.origin : ''

export const api = setupCache(
  axios.create({
    baseURL: origin, // full current host, no trailing slash
    headers: { 'Content-Type': 'application/json' },
  }),
  { ttl: 1000 }
)

export default api
