import { createORM } from 'pinia-orm'
import { createPiniaOrmAxios } from '@pinia-orm/axios'
import axios from 'axios'
import { setupCache } from 'axios-cache-interceptor'

// Install Pinia ORM and Axios plugin on a given pinia instance
export function setupPiniaOrm(pinia) {
  // Enhance axios with cache interceptor and default 1s TTL for GETs
  const axiosCached = setupCache(axios, {
    ttl: 1000,
  })
  axiosCached.defaults.baseURL = '' // TODO allow to set baseURL

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
