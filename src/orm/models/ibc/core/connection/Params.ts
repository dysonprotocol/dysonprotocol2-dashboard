import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

export class IbcConnectionParams extends Model {
  static entity = 'ibc_connection_params'
  static primaryKey = 'singleton'

  static fields() {
    return {
      singleton: this.string('default'),
      max_expected_time_per_block: this.string('0'),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetch(this: Request) {
          return this.get('/ibc/core/connection/v1/params', {
            dataTransformer: ({
              data,
            }: {
              data?: { params?: { max_expected_time_per_block?: string | number } }
            }) => {
              const p = (data?.params as { max_expected_time_per_block?: string | number }) || {}
              return [
                {
                  singleton: 'default',
                  max_expected_time_per_block: String(p.max_expected_time_per_block ?? '0'),
                },
              ]
            },
          })
        },
      },
    },
  }
}

export default IbcConnectionParams
