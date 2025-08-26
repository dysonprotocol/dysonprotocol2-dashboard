import { definePiniaOrmPlugin } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import axios from 'axios'

// Fallback: if createPiniaOrmAxios registration causes config errors,
// set axios instance globally post-init.
export function setupPiniaOrmAxios() {
  // Set axios instance for useAxiosRepo at runtime
  // The plugin exposes Model.setAxios usually; here we rely on useAxiosRepo side-effects
  // Optionally, nothing is required if requests pass baseURL directly
  axios.defaults.baseURL = 'http://localhost:1317'
  axios.defaults.headers.common['Accept'] = 'application/json'
}
