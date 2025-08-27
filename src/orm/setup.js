import { createORM } from 'pinia-orm'
import { createPiniaOrmAxios } from '@pinia-orm/axios'
import axios from 'axios'
import { setupCache } from 'axios-cache-interceptor'

// Install Pinia ORM and Axios plugin on a given pinia instance
export function setupPiniaOrm(pinia) {
  // Enhance axios with cache interceptor and default 1s TTL for GETs
  const axiosCached = setupCache(axios)
  axiosCached.defaults.baseURL = ''
  axiosCached.defaults.headers.common['Accept'] = 'application/json'
  axiosCached.interceptors.request.use((config) => {
    if (!config.method || config.method.toLowerCase() === 'get') {
      config.cache = config.cache || {}
      if (typeof config.cache.ttl !== 'number') config.cache.ttl = 1000
      // Avoid CORS preflight by stripping non-safelisted headers possibly added by cache
      const h = config.headers || {}
      delete h['If-None-Match']
      delete h['if-none-match']
      delete h['If-Modified-Since']
      delete h['if-modified-since']
      delete h['Cache-Control']
      delete h['cache-control']
      delete h['Pragma']
      delete h['pragma']
      delete h['X-Requested-With']
      delete h['x-requested-with']
      config.headers = h
    }
    return config
  })

  const orm = createORM({
    model: {
      // keep everything visible by default for easier demoing
      visible: ['*'],
    },
    plugins: [
      createPiniaOrmAxios({
        axios: axiosCached,
        baseURL: axiosCached.defaults.baseURL,
        headers: axiosCached.defaults.headers.common,
      }),
    ],
  })

  pinia.use(orm)
}
