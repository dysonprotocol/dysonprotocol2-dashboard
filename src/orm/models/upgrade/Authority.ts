import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

export class UpgradeAuthority extends Model {
  static entity = 'upgrade_authority'
  static primaryKey = 'singleton'

  static fields() {
    return {
      singleton: this.string('default'),
      address: this.string(''),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetch(this: Request) {
          return this.get(`/cosmos/upgrade/v1beta1/authority`, {
            dataTransformer: ({ data }: { data: { address?: string } }) => [
              { singleton: 'default', address: String(data?.address || '') },
            ],
          })
        },
      },
    },
  }
}

export default UpgradeAuthority
