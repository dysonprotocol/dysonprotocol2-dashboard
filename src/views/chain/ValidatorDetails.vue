<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useRepo } from 'pinia-orm'
import Validator from '@/orm/models/staking/Validator'

const route = useRoute()
const valAddress = computed(() => String(route.params.valAddress || ''))

const api = useAxiosRepo(Validator).api()
const repo = useRepo(Validator)

onMounted(() => {
  if (valAddress.value)
    api.fetchByOperator(valAddress.value).catch((e: unknown) => console.error(e))
})

type ValidatorRecord = {
  operator_address: string
  moniker: string
  status: string
  description: Record<string, unknown>
  consensus_pubkey?: Record<string, unknown>
  jailed?: boolean
  tokens?: string
  delegator_shares?: string
  unbonding_height?: string
  unbonding_time?: string
  commission?: Record<string, unknown>
  min_self_delegation?: string
  unbonding_on_hold_ref_count?: string
  unbonding_ids?: string[]
}

const val = computed(() => repo.find(valAddress.value) as ValidatorRecord | null)
</script>

<template>
  <div class="p-4 space-y-3">
    <div class="text-lg font-medium">Validator {{ val?.moniker }}</div>
    <div v-if="val" class="p-3 space-y-3 max-w-3xl mx-auto">
      <div class="overflow-x-auto">
        <table class="table table-zebra table-sm w-full">
          <tbody>
            <tr>
              <th class="w-56">Moniker</th>
              <td>{{ val.moniker }}</td>
            </tr>
            <tr>
              <th>Operator Address</th>
              <td class="break-all">
                <code class="">{{ val.operator_address }}</code>
              </td>
            </tr>
            <tr>
              <th>Status</th>
              <td>
                <span class="">{{ val.status }}</span>
              </td>
            </tr>
            <tr>
              <th>Jailed</th>
              <td>
                {{ val.jailed ? 'Yes' : 'No' }}
              </td>
            </tr>
            <tr>
              <th>Tokens</th>
              <td>
                <code class="">{{ val.tokens || '0' }}</code>
              </td>
            </tr>
            <tr>
              <th>Delegator Shares</th>
              <td>
                <code class="">{{ val.delegator_shares || '0' }}</code>
              </td>
            </tr>
            <tr>
              <th>Min Self Delegation</th>
              <td>
                <code class="">{{ val.min_self_delegation || '0' }}</code>
              </td>
            </tr>
            <tr>
              <th>Consensus PubKey Type</th>
              <td>
                {{
                  (val.consensus_pubkey &&
                    (val.consensus_pubkey.type_url || val.consensus_pubkey['@type'])) ||
                  '—'
                }}
              </td>
            </tr>
            <tr>
              <th>Commission Rate</th>
              <td>
                {{
                  (val.commission &&
                    val.commission.commission_rates &&
                    val.commission.commission_rates.rate) ||
                  '—'
                }}
              </td>
            </tr>
            <tr>
              <th>Commission Max Rate</th>
              <td>
                {{
                  (val.commission &&
                    val.commission.commission_rates &&
                    val.commission.commission_rates.max_rate) ||
                  '—'
                }}
              </td>
            </tr>
            <tr>
              <th>Commission Max Change</th>
              <td>
                {{
                  (val.commission &&
                    val.commission.commission_rates &&
                    val.commission.commission_rates.max_change_rate) ||
                  '—'
                }}
              </td>
            </tr>
            <tr>
              <th>Commission Updated</th>
              <td>{{ (val.commission && val.commission.update_time) || '—' }}</td>
            </tr>
            <tr>
              <th>Unbonding Height</th>
              <td>{{ val.unbonding_height || '—' }}</td>
            </tr>
            <tr>
              <th>Unbonding Time</th>
              <td>{{ val.unbonding_time || '—' }}</td>
            </tr>
            <tr>
              <th>Unbonding On Hold Ref Count</th>
              <td>{{ val.unbonding_on_hold_ref_count || '0' }}</td>
            </tr>
            <tr>
              <th>Unbonding IDs</th>
              <td>
                <div
                  v-if="Array.isArray(val.unbonding_ids) && val.unbonding_ids.length"
                  class="flex flex-wrap gap-1"
                >
                  <span
                    v-for="id in val.unbonding_ids"
                    :key="id"
                    class="badge badge-ghost badge-xs"
                    >{{ id }}</span
                  >
                </div>
                <span v-else>—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="overflow-x-auto">
        <table class="table table-zebra table-sm w-full">
          <tbody>
            <tr>
              <th class="w-56">Identity</th>
              <td>{{ (val.description && (val.description.identity as string)) || '—' }}</td>
            </tr>
            <tr>
              <th>Website</th>
              <td>
                <a
                  v-if="val.description && (val.description.website as string)"
                  :href="String(val.description.website)"
                  target="_blank"
                  rel="noreferrer"
                  class="link link-primary link-hover"
                >
                  {{ String(val.description.website) }}
                </a>
                <span v-else>—</span>
              </td>
            </tr>
            <tr>
              <th>Security Contact</th>
              <td>
                {{ (val.description && (val.description.security_contact as string)) || '—' }}
              </td>
            </tr>
            <tr>
              <th>Details</th>
              <td>{{ (val.description && (val.description.details as string)) || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
