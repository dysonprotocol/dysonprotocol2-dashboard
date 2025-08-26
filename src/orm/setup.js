import { createORM } from 'pinia-orm'
import { createPiniaOrmAxios } from '@pinia-orm/axios'
import axios from 'axios'

// Install Pinia ORM and Axios plugin on a given pinia instance
export function setupPiniaOrm(pinia) {
  const orm = createORM({
    model: {
      // keep everything visible by default for easier demoing
      visible: ['*'],
    },
    plugins: [
      createPiniaOrmAxios({
        axios,
        baseURL: 'http://localhost:1317',
        headers: { Accept: 'application/json' },
      }),
    ],
  })

  pinia.use(orm)
}
