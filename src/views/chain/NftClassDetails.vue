<template>
  <div class="space-y-4 w-full mx-auto md:w-3/4">
    <h1 class="text-2xl font-semibold">NFT Class</h1>
    <div class="rounded-box p-4 w-full">
      <div v-if="!hasLoaded" class="opacity-70">Loading…</div>
      <div v-else-if="error" class="text-error">{{ error }}</div>
      <div v-else-if="!klass" class="opacity-70">Class not found.</div>
      <div v-else class="space-y-4">
        <table class="table table-sm">
          <tbody>
            <tr>
              <th>Class ID</th>
              <td class="font-mono break-all">{{ klass.id }}</td>
            </tr>
            <tr>
              <th>Name</th>
              <td>{{ klass.name || '—' }}</td>
            </tr>
            <tr>
              <th>Symbol</th>
              <td>{{ klass.symbol || '—' }}</td>
            </tr>
            <tr>
              <th>Description</th>
              <td class="whitespace-pre-wrap">{{ klass.description || '—' }}</td>
            </tr>
            <tr>
              <th>URI</th>
              <td class="font-mono break-all">{{ klass.uri || '—' }}</td>
            </tr>
            <tr>
              <th>URI Hash</th>
              <td class="font-mono break-all">{{ klass.uri_hash || '—' }}</td>
            </tr>
            <tr>
              <th>Data</th>
              <td>
                <pre class="text-xs whitespace-pre-wrap break-words">{{
                  prettyJson(klass.data)
                }}</pre>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="space-y-6">
          <div>
            <div class="font-medium mb-2">Manage Class</div>
            <div class="text-xs opacity-70 mb-2">
              {{ routeName }} managed by: <span class="font-mono">{{ resolvedAddress }}</span>
            </div>

            <div class="grid gap-3">
              <div class="p-3 border rounded">
                <div class="font-semibold text-sm mb-2">Set Extra Data</div>
                <input v-model.trim="classExtra" class="input w-full" placeholder="extra_data" />
                <div class="mt-2">
                  <button class="btn btn-primary btn-sm" @click="setClassExtra">Save</button>
                </div>
                <div v-if="classExtraError" class="text-error text-sm mt-1">
                  {{ classExtraError }}
                </div>
              </div>

              <div class="p-3 border rounded">
                <div class="font-semibold text-sm mb-2">Set Always Listed</div>
                <select v-model="classAlwaysListed" class="select select-bordered w-full">
                  <option :value="true">true</option>
                  <option :value="false">false</option>
                </select>
                <div class="mt-2">
                  <button class="btn btn-primary btn-sm" @click="setClassAlwaysListed">Save</button>
                </div>
                <div v-if="classAlwaysError" class="text-error text-sm mt-1">
                  {{ classAlwaysError }}
                </div>
              </div>

              <div class="p-3 border rounded">
                <div class="font-semibold text-sm mb-2">Set Valuation Fee Percent</div>
                <input
                  v-model.trim="classValFeePct"
                  class="input w-full"
                  placeholder="valuation_fee_pct (Dec)"
                />
                <div class="mt-2">
                  <button class="btn btn-primary btn-sm" @click="setClassValFeePct">Save</button>
                </div>
                <div v-if="classValFeeError" class="text-error text-sm mt-1">
                  {{ classValFeeError }}
                </div>
              </div>

              <div class="p-3 border rounded">
                <div class="font-semibold text-sm mb-2">Set Valuation Period</div>
                <input
                  v-model.trim="classValPeriodSec"
                  class="input w-full"
                  placeholder="seconds"
                />
                <div class="mt-2">
                  <button class="btn btn-primary btn-sm" @click="setClassValPeriod">Save</button>
                </div>
                <div v-if="classValPeriodError" class="text-error text-sm mt-1">
                  {{ classValPeriodError }}
                </div>
              </div>

              <div class="p-3 border rounded">
                <div class="font-semibold text-sm mb-2">Set Bid Timeout</div>
                <input
                  v-model.trim="classBidTimeoutSec"
                  class="input w-full"
                  placeholder="seconds"
                />
                <div class="mt-2">
                  <button class="btn btn-primary btn-sm" @click="setClassBidTimeout">Save</button>
                </div>
                <div v-if="classBidTimeoutError" class="text-error text-sm mt-1">
                  {{ classBidTimeoutError }}
                </div>
              </div>

              <div class="p-3 border rounded">
                <div class="font-semibold text-sm mb-2">Set Allowed Denoms</div>
                <input
                  v-model.trim="classAllowedDenoms"
                  class="input w-full"
                  placeholder="denoms (comma-separated)"
                />
                <div class="mt-2">
                  <button class="btn btn-primary btn-sm" @click="setClassAllowedDenoms">
                    Save
                  </button>
                </div>
                <div v-if="classAllowedDenomsError" class="text-error text-sm mt-1">
                  {{ classAllowedDenomsError }}
                </div>
              </div>

              <div class="p-3 border rounded">
                <div class="font-semibold text-sm mb-2">Set Reject Bid Fee Percent</div>
                <input
                  v-model.trim="classRejectFeePct"
                  class="input w-full"
                  placeholder="reject fee percent (Dec)"
                />
                <div class="mt-2">
                  <button class="btn btn-primary btn-sm" @click="setClassRejectFeePct">Save</button>
                </div>
                <div v-if="classRejectFeeError" class="text-error text-sm mt-1">
                  {{ classRejectFeeError }}
                </div>
              </div>

              <div class="p-3 border rounded">
                <div class="font-semibold text-sm mb-2">Set Minimum Bid Increase Percent</div>
                <input
                  v-model.trim="classMinBidIncPct"
                  class="input w-full"
                  placeholder="min bid increase percent (Dec)"
                />
                <div class="mt-2">
                  <button class="btn btn-primary btn-sm" @click="setClassMinBidIncPct">Save</button>
                </div>
                <div v-if="classMinBidIncError" class="text-error text-sm mt-1">
                  {{ classMinBidIncError }}
                </div>
              </div>

              <div class="p-3 border rounded">
                <div class="font-semibold text-sm mb-2">Delete Class</div>
                <button class="btn btn-error btn-sm" @click="deleteClass">Delete</button>
                <div v-if="delClassError" class="text-error text-sm mt-1">{{ delClassError }}</div>
              </div>

              <div class="p-3 border rounded">
                <div class="font-semibold text-sm mb-2">Mint NFT</div>
                <input v-model.trim="mintNftId" class="input w-full" placeholder="nft_id" />
                <input v-model.trim="mintUri" class="input w-full" placeholder="uri (optional)" />
                <input
                  v-model.trim="mintUriHash"
                  class="input w-full"
                  placeholder="uri_hash (optional)"
                />
                <div class="mt-2">
                  <button class="btn btn-primary btn-sm" @click="mintNft">Mint</button>
                </div>
                <div v-if="mintError" class="text-error text-sm mt-1">{{ mintError }}</div>
              </div>

              <div class="p-3 border rounded">
                <div class="font-semibold text-sm mb-2">Burn NFT</div>
                <input v-model.trim="burnNftId" class="input w-full" placeholder="nft_id" />
                <div class="mt-2">
                  <button class="btn btn-primary btn-sm" @click="burnNft">Burn</button>
                </div>
                <div v-if="burnNftError" class="text-error text-sm mt-1">{{ burnNftError }}</div>
              </div>
            </div>
          </div>

          <div class="font-medium mb-2">NFTs</div>
          <div v-if="isLoadingNfts" class="opacity-70">Loading…</div>
          <div v-else-if="nftsError" class="text-error">{{ nftsError }}</div>
          <div v-else-if="nfts.length === 0" class="opacity-70">No NFTs in this class.</div>
          <div v-else class="overflow-x-auto">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Owner</th>
                  <th>URI</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="n in nfts" :key="n.id">
                  <td class="font-mono">
                    <RouterLink
                      :to="{
                        name: 'NameNftDetail',
                        params: { name: routeName, classid: klassId, id: n.id },
                      }"
                      class="link link-primary"
                    >
                      {{ n.id }}
                    </RouterLink>
                  </td>
                  <td class="font-mono">
                    <AddressDisplay :address="n.owner" :truncate="0" />
                  </td>
                  <td class="font-mono break-all">{{ n.uri || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useRoute } from 'vue-router'
import AddressDisplay from '../../components/AddressDisplay.vue'
import NftClass from '../../orm/models/nft/NftClass'
import NftItem from '../../orm/models/nft/NftItem'
import { useWallet } from '../../composables/useWallet'
import NameResolution from '../../orm/models/nameservice/NameResolution'
import NameserviceActions from '../../orm/models/nameservice/Actions'

const route = useRoute()
const routeName = computed(() => String(route.params.name || ''))
const klassId = computed(() => String(route.params.classid || ''))
const wallet = useWallet()

const resolvedAddress = computed(() => {
  const repo = useRepo(NameResolution)
  return (repo.find(routeName.value) as any)?.address || ''
})

const isLoading = ref(false)
const hasLoaded = ref(false)
const error = ref('')
const klass = ref<{
  id: string
  name: string
  symbol: string
  description: string
  uri: string
  uri_hash: string
  data?: unknown
} | null>(null)

const isLoadingNfts = ref(false)
const nftsError = ref('')
const nfts = ref<Array<{ id: string; owner: string; uri: string }>>([])

// Class management form state
const classExtra = ref('')
const classExtraError = ref('')
const classAlwaysListed = ref(true)
const classAlwaysError = ref('')
const classValFeePct = ref('')
const classValFeeError = ref('')
const classValPeriodSec = ref('')
const classValPeriodError = ref('')
const classBidTimeoutSec = ref('')
const classBidTimeoutError = ref('')
const classAllowedDenoms = ref('')
const classAllowedDenomsError = ref('')
const classRejectFeePct = ref('')
const classRejectFeeError = ref('')
const classMinBidIncPct = ref('')
const classMinBidIncError = ref('')
const delClassError = ref('')
const mintNftId = ref('')
const mintUri = ref('')
const mintUriHash = ref('')
const mintError = ref('')
const burnNftId = ref('')
const burnNftError = ref('')

function prettyJson(v: unknown) {
  try {
    if (v == null) return ''
    return JSON.stringify(v, null, 2)
  } catch (e) {
    console.error(e)
    return String(v)
  }
}

async function fetchClass(id: string) {
  if (!id) return
  isLoading.value = true
  hasLoaded.value = false
  error.value = ''
  klass.value = null
  try {
    await useAxiosRepo(NftClass).api().fetchClass(id)
    const repo = useRepo(NftClass)
    const rec = (repo.find(id) as any) || null
    if (!rec) return
    klass.value = {
      id: String(rec.id || ''),
      name: String(rec.name || ''),
      symbol: String(rec.symbol || ''),
      description: String(rec.description || ''),
      uri: String(rec.uri || ''),
      uri_hash: String(rec.uri_hash || ''),
      data: rec.data,
    }
  } catch (e: any) {
    error.value = e?.message || 'Failed to load class'
  } finally {
    isLoading.value = false
    hasLoaded.value = true
  }
}

async function fetchNfts(id: string) {
  if (!id) return
  isLoadingNfts.value = true
  nftsError.value = ''
  nfts.value = []
  try {
    await useAxiosRepo(NftItem).api().fetchNfts({ class_id: id, limit: '100' })
    const repo = useRepo(NftItem)
    const list = repo
      .query()
      .where('class_id', (v: string) => v === id)
      .get() as any[] as Array<{ id: string; owner?: string; uri?: string }>
    // Backfill owners for items without owner field
    const idsNeedingOwner = list.filter((r) => !r.owner).map((r) => r.id)
    if (idsNeedingOwner.length > 0) {
      const tasks = idsNeedingOwner.map((nid) => useAxiosRepo(NftItem).api().fetchOwner(id, nid))
      const results = await Promise.allSettled(tasks)
      for (const r of results) if (r.status === 'rejected') console.error(r.reason)
    }
    const refreshed = repo
      .query()
      .where('class_id', (v: string) => v === id)
      .get() as any[] as Array<{ id: string; owner?: string; uri?: string }>
    nfts.value = refreshed.map((r) => ({
      id: String(r.id),
      owner: String(r.owner || ''),
      uri: String(r.uri || ''),
    }))
  } catch (e: any) {
    nftsError.value = e?.message || 'Failed to load NFTs'
  } finally {
    isLoadingNfts.value = false
  }
}

watchEffect(() => {
  const id = klassId.value
  if (!id) return
  // Resolve manager address for forms
  void useAxiosRepo(NameResolution).api().resolve(routeName.value)
  void Promise.all([fetchClass(id), fetchNfts(id)])
})

// ---- Class management actions ----
async function setClassExtra() {
  classExtraError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .setNFTClassExtraData({
        name_destination: resolvedAddress.value,
        class_id: klassId.value,
        extra_data: classExtra.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Set class extra_data failed')
    await fetchClass(klassId.value)
  } catch (e: any) {
    console.error(e)
    classExtraError.value = e?.message || String(e)
  }
}

async function setClassAlwaysListed() {
  classAlwaysError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .setNFTClassAlwaysListed({
        name_destination: resolvedAddress.value,
        class_id: klassId.value,
        always_listed: Boolean(classAlwaysListed.value),
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Set class always_listed failed')
    await fetchClass(klassId.value)
  } catch (e: any) {
    console.error(e)
    classAlwaysError.value = e?.message || String(e)
  }
}

async function setClassValFeePct() {
  classValFeeError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .setNFTClassValuationFeePct({
        name_destination: resolvedAddress.value,
        class_id: klassId.value,
        valuation_fee_pct: classValFeePct.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Set class valuation_fee_pct failed')
    await fetchClass(klassId.value)
  } catch (e: any) {
    console.error(e)
    classValFeeError.value = e?.message || String(e)
  }
}

async function setClassValPeriod() {
  classValPeriodError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .setNFTClassValuationPeriod({
        name_destination: resolvedAddress.value,
        class_id: klassId.value,
        valuation_period: `${String(Number(classValPeriodSec.value || '0'))}s`,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Set class valuation_period failed')
    await fetchClass(klassId.value)
  } catch (e: any) {
    console.error(e)
    classValPeriodError.value = e?.message || String(e)
  }
}

async function setClassBidTimeout() {
  classBidTimeoutError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .setNFTClassBidTimeout({
        name_destination: resolvedAddress.value,
        class_id: klassId.value,
        bid_timeout: `${String(Number(classBidTimeoutSec.value || '0'))}s`,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Set class bid_timeout failed')
    await fetchClass(klassId.value)
  } catch (e: any) {
    console.error(e)
    classBidTimeoutError.value = e?.message || String(e)
  }
}

async function setClassAllowedDenoms() {
  classAllowedDenomsError.value = ''
  try {
    const list = classAllowedDenoms.value
      .split(',')
      .map((s: string) => s.trim())
      .filter((s: string) => s)
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .setNFTClassAllowedDenoms({
        name_destination: resolvedAddress.value,
        class_id: klassId.value,
        allowed_denoms: list,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Set class allowed_denoms failed')
    await fetchClass(klassId.value)
  } catch (e: any) {
    console.error(e)
    classAllowedDenomsError.value = e?.message || String(e)
  }
}

async function setClassRejectFeePct() {
  classRejectFeeError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .setNFTClassRejectBidValuationFeePercent({
        name_destination: resolvedAddress.value,
        class_id: klassId.value,
        reject_bid_valuation_fee_percent: classRejectFeePct.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Set class reject fee percent failed')
    await fetchClass(klassId.value)
  } catch (e: any) {
    console.error(e)
    classRejectFeeError.value = e?.message || String(e)
  }
}

async function setClassMinBidIncPct() {
  classMinBidIncError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .setNFTClassMinimumBidPercentIncrease({
        name_destination: resolvedAddress.value,
        class_id: klassId.value,
        minimum_bid_percent_increase: classMinBidIncPct.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Set class min bid increase failed')
    await fetchClass(klassId.value)
  } catch (e: any) {
    console.error(e)
    classMinBidIncError.value = e?.message || String(e)
  }
}

async function deleteClass() {
  delClassError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .deleteClass({
        name_destination: resolvedAddress.value,
        class_id: klassId.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Delete class failed')
  } catch (e: any) {
    console.error(e)
    delClassError.value = e?.message || String(e)
  }
}

async function mintNft() {
  mintError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .mintNft({
        name_destination: resolvedAddress.value,
        class_id: klassId.value,
        nft_id: mintNftId.value,
        uri: mintUri.value || undefined,
        uri_hash: mintUriHash.value || undefined,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Mint NFT failed')
    await fetchNfts(klassId.value)
  } catch (e: any) {
    console.error(e)
    mintError.value = e?.message || String(e)
  }
}

async function burnNft() {
  burnNftError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .burnNft({
        name_destination: resolvedAddress.value,
        class_id: klassId.value,
        nft_id: burnNftId.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Burn NFT failed')
    await fetchNfts(klassId.value)
  } catch (e: any) {
    console.error(e)
    burnNftError.value = e?.message || String(e)
  }
}
</script>
