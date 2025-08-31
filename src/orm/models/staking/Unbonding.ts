import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

type Entry = {
  initial_balance?: string | number
  balance?: string | number
  completion_time?: string
  creation_height?: string | number
}

export class DelegatorUnbonding extends Model {
  static entity = 'delegator_unbondings'
  static primaryKey = ['delegator_address', 'validator_address', 'creation_height']

  static fields() {
    return {
      delegator_address: this.string(''),
      validator_address: this.string(''),
      initial_balance: this.string('0'),
      balance: this.string('0'),
      completion_time: this.string(''),
      creation_height: this.string('0'),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetchAll(this: Request, delegator: string) {
          return this.get(`/cosmos/staking/v1beta1/delegators/${delegator}/unbonding_delegations`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                unbonding_responses?: Array<{
                  validator_address?: string
                  entries?: Entry[]
                }>
              }
            }) => {
              const list = Array.isArray(data?.unbonding_responses)
                ? data!.unbonding_responses!
                : []
              const rows: any[] = []
              for (const r of list) {
                const val = String(r?.validator_address || '')
                const entries: Entry[] = Array.isArray(r?.entries) ? (r!.entries as Entry[]) : []
                for (const e of entries) {
                  rows.push({
                    delegator_address: delegator,
                    validator_address: val,
                    initial_balance: String(e?.initial_balance ?? '0'),
                    balance: String(e?.balance ?? '0'),
                    completion_time: String(e?.completion_time ?? ''),
                    creation_height: String(e?.creation_height ?? '0'),
                  })
                }
              }
              return rows
            },
          })
        },
      },
    },
  }
}

export default DelegatorUnbonding
