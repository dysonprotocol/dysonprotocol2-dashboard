import { Model } from 'pinia-orm'
import type { Request } from '@pinia-orm/axios'

export class LatestBlock extends Model {
  static entity = 'base_tm_latest_block'
  static primaryKey = 'height'

  static fields() {
    return {
      height: this.string('0'),
      time: this.string(''),
      proposer_address: this.string(''),
      hash: this.string(''),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetch(this: Request) {
          return this.get(`/cosmos/base/tendermint/v1beta1/blocks/latest`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                sdk_block?: {
                  header?: { height?: string | number; time?: string; proposer_address?: string }
                }
                block_id?: { hash?: string }
              }
            }) => {
              const h = data?.sdk_block?.header
              const hash = data?.block_id?.hash
              if (!h?.height) return []
              return [
                {
                  height: String(h.height),
                  time: String(h.time || ''),
                  proposer_address: String(h.proposer_address || ''),
                  hash: String(hash || ''),
                },
              ]
            },
          })
        },
        async fetchByHeight(this: Request, height: string | number) {
          return this.get(`/cosmos/base/tendermint/v1beta1/blocks/${height}`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                sdk_block?: {
                  header?: { height?: string | number; time?: string; proposer_address?: string }
                }
                block_id?: { hash?: string }
              }
            }) => {
              const h = data?.sdk_block?.header
              const hash = data?.block_id?.hash
              if (!h?.height) return []
              return [
                {
                  height: String(h.height),
                  time: String(h.time || ''),
                  proposer_address: String(h.proposer_address || ''),
                  hash: String(hash || ''),
                },
              ]
            },
          })
        },
      },
    },
  }
}

export class LatestValidatorSet extends Model {
  static entity = 'base_tm_latest_valset'
  static primaryKey = 'address'

  static fields() {
    return {
      address: this.string(''),
      voting_power: this.string('0'),
      proposer_priority: this.string('0'),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetch(this: Request) {
          return this.get(`/cosmos/base/tendermint/v1beta1/validatorsets/latest`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                validators?: Array<{
                  address?: string
                  voting_power?: string | number
                  proposer_priority?: string | number
                }>
              }
            }) => {
              const list = Array.isArray(data?.validators) ? data.validators : []
              return list
                .filter((v) => v?.address)
                .map((v) => ({
                  address: String(v.address),
                  voting_power: String(v.voting_power ?? '0'),
                  proposer_priority: String(v.proposer_priority ?? '0'),
                }))
            },
          })
        },
      },
    },
  }
}

export class ValidatorSetByHeight extends Model {
  static entity = 'base_tm_valset_by_height'
  static primaryKey = ['height', 'address']

  static fields() {
    return {
      height: this.string('0'),
      address: this.string(''),
      voting_power: this.string('0'),
      proposer_priority: this.string('0'),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetch(this: Request, height: string | number) {
          return this.get(`/cosmos/base/tendermint/v1beta1/validatorsets/${height}`, {
            dataTransformer: ({
              data,
            }: {
              data: {
                block_height?: string | number
                validators?: Array<{
                  address?: string
                  voting_power?: string | number
                  proposer_priority?: string | number
                }>
              }
            }) => {
              const list = Array.isArray(data?.validators) ? data.validators : []
              const h = String(data?.block_height ?? height)
              return list
                .filter((v) => v?.address)
                .map((v) => ({
                  height: h,
                  address: String(v.address),
                  voting_power: String(v.voting_power ?? '0'),
                  proposer_priority: String(v.proposer_priority ?? '0'),
                }))
            },
          })
        },
      },
    },
  }
}

export class Syncing extends Model {
  static entity = 'base_tm_syncing'
  static primaryKey = 'singleton'

  static fields() {
    return {
      singleton: this.string('default'),
      syncing: this.boolean(false),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetch(this: Request) {
          return this.get(`/cosmos/base/tendermint/v1beta1/syncing`, {
            dataTransformer: ({ data }: { data?: { syncing?: boolean } }) => [
              { singleton: 'default', syncing: Boolean(data?.syncing) },
            ],
          })
        },
      },
    },
  }
}

export class NodeInfo extends Model {
  static entity = 'base_tm_node_info'
  static primaryKey = 'singleton'

  static fields() {
    return {
      singleton: this.string('default'),
      app_name: this.string(''),
      version: this.string(''),
      cosmos_sdk_version: this.string(''),
    }
  }

  static config = {
    axiosApi: {
      actions: {
        async fetch(this: Request) {
          return this.get(`/cosmos/base/tendermint/v1beta1/node_info`, {
            dataTransformer: ({
              data,
            }: {
              data?: {
                application_version?: {
                  app_name?: string
                  version?: string
                  cosmos_sdk_version?: string
                }
              }
            }) => [
              {
                singleton: 'default',
                app_name: String(data?.application_version?.app_name || ''),
                version: String(data?.application_version?.version || ''),
                cosmos_sdk_version: String(data?.application_version?.cosmos_sdk_version || ''),
              },
            ],
          })
        },
      },
    },
  }
}

export default LatestBlock
