<template>
  <div class="">
    <h2 class="text-xl font-semibold">
      Authz — <code>{{ address }}</code>
    </h2>
    <div class="grid md:grid-cols-2 gap-6">
      <div>
        <h3 class="font-semibold">Grants given</h3>
        <div class="flex flex-col gap-3">
          <div
            v-for="g in asGranter"
            :key="g.granter + ':' + g.grantee + ':' + g.msg_type_url"
            class="p-3 border rounded"
          >
            <table class="text-sm">
              <tbody>
                <tr>
                  <td class="pr-2 opacity-70">Grantee:</td>
                  <td>
                    <span class="font-mono break-all">{{ g.grantee }}</span>
                  </td>
                </tr>
                <tr>
                  <td class="pr-2 opacity-70">Authorization:</td>
                  <td>
                    <code class="break-all">{{ g.type_url || '—' }}</code>
                  </td>
                </tr>
                <tr>
                  <td class="pr-2 opacity-70">Msg Type:</td>
                  <td>
                    <code class="break-all">{{ g.msg_type_url || '—' }}</code>
                  </td>
                </tr>
                <tr>
                  <td class="pr-2 opacity-70">Expiration:</td>
                  <td>{{ g.expiration || '—' }}</td>
                </tr>
              </tbody>
            </table>
            <div class="mt-2 flex items-center gap-2">
              <button
                class="btn btn-sm btn-error"
                @click="revokeGrantCard(g.granter, g.grantee, g.msg_type_url)"
              >
                revoke
              </button>
            </div>
            <div
              v-if="revokeErrorsByKey[grantKey(g)]"
              class="text-xs text-red-600 mt-2 whitespace-pre-wrap"
            >
              {{ revokeErrorsByKey[grantKey(g)] }}
            </div>
          </div>
          <div v-if="asGranter.length === 0" class="opacity-70">None</div>
        </div>
      </div>
      <div>
        <h3 class="font-semibold">Grants received</h3>
        <div class="flex flex-col gap-3">
          <div
            v-for="g in asGrantee"
            :key="g.granter + ':' + g.grantee + ':' + g.msg_type_url"
            class="p-3 border rounded"
          >
            <table class="text-sm">
              <tbody>
                <tr>
                  <td class="pr-2 opacity-70">Granter:</td>
                  <td>
                    <span class="font-mono break-all">{{ g.granter }}</span>
                  </td>
                </tr>
                <tr>
                  <td class="pr-2 opacity-70">Authorization:</td>
                  <td>
                    <code class="break-all">{{ g.type_url || '—' }}</code>
                  </td>
                </tr>
                <tr>
                  <td class="pr-2 opacity-70">Msg Type:</td>
                  <td>
                    <code class="break-all">{{ g.msg_type_url || '—' }}</code>
                  </td>
                </tr>
                <tr>
                  <td class="pr-2 opacity-70">Expiration:</td>
                  <td>{{ g.expiration || '—' }}</td>
                </tr>
              </tbody>
            </table>
            <div
              v-if="revokeErrorsByKey[grantKey(g)]"
              class="text-xs text-red-600 mt-2 whitespace-pre-wrap"
            >
              {{ revokeErrorsByKey[grantKey(g)] }}
            </div>
          </div>
          <div v-if="asGrantee.length === 0" class="opacity-70">None</div>
        </div>
      </div>
    </div>

    <section class="grid gap-6 md:grid-cols-3 mt-6">
      <div class="space-y-2 p-4 border rounded">
        <h3 class="font-semibold">Grant</h3>
        <div class="grid gap-2 md:grid-cols-2">
          <Input v-model="grantGranter" class="w-full" placeholder="granter address" />
          <Input v-model="grantGrantee" class="w-full" placeholder="grantee address" />
        </div>
        <Input v-model="grantExpiration" class="w-full" placeholder="expiration RFC3339" />
        <Input
          v-model="grantAuthzMsgType"
          class="w-full"
          placeholder="msg_type_url (for Generic)"
        />
        <Textarea
          v-model="authorizationJson"
          class="w-full h-24"
          placeholder="authorization JSON (optional; if set, used instead of Generic)"
        />
        <div class="flex gap-2">
          <Button @click="prefillGenericGrant">Prefill Generic (MsgSend)</Button>
          <Button @click="prefillBankSendAuthz">Prefill Bank SendAuthorization</Button>
        </div>
        <div class="flex gap-2">
          <Button @click="submitGrant">Grant</Button>
        </div>
        <div v-if="grantError" class="text-sm text-red-600">
          {{ grantError }}
        </div>
      </div>

      <div class="space-y-2 p-4 border rounded">
        <h3 class="font-semibold">Revoke</h3>
        <div class="grid gap-2 md:grid-cols-2">
          <Input v-model="revokeGranter" class="w-full" placeholder="granter address" />
          <Input v-model="revokeGrantee" class="w-full" placeholder="grantee address" />
        </div>
        <Input v-model="revokeMsgTypeUrl" class="w-full" placeholder="msg_type_url" />
        <div class="flex gap-2">
          <Button @click="submitRevoke">Revoke</Button>
        </div>
        <div v-if="revokeError" class="text-sm text-red-600">
          {{ revokeError }}
        </div>
      </div>

      <div class="space-y-2 p-4 border rounded">
        <h3 class="font-semibold">Exec</h3>
        <Textarea v-model="execMsgsJson" class="w-full h-24" placeholder="exec msgs JSON array" />
        <Input v-model="execGrantee" class="w-full" placeholder="grantee address" />
        <Input v-model="execMemo" class="w-full" placeholder="exec memo (optional)" />
        <Input
          v-model="execGranterForRefresh"
          class="w-full"
          placeholder="granter for refresh (optional)"
        />
        <Button @click="submitExec">Exec</Button>
        <div v-if="execError" class="text-sm text-red-600">
          {{ execError }}
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import Grant from '@/orm/models/authz/Grant'
import { useWallet } from '@/composables/useWallet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const props = defineProps<{ address: string }>()

const repo = useRepo(Grant)
type GrantRow = {
  granter: string
  grantee: string
  type_url: string
  msg_type_url: string
  expiration: string
}
const allGrants = computed<GrantRow[]>(() =>
  (repo.all() as unknown as Array<Record<string, unknown>>).map((m) => ({
    granter: String(m?.granter || ''),
    grantee: String(m?.grantee || ''),
    type_url: String(m?.type_url || ''),
    msg_type_url: String(m?.msg_type_url || ''),
    expiration: String(m?.expiration || ''),
  }))
)
const asGranter = computed<GrantRow[]>(() =>
  allGrants.value.filter((g) => g.granter === props.address)
)
const asGrantee = computed<GrantRow[]>(() =>
  allGrants.value.filter((g) => g.grantee === props.address)
)

const wallet = useWallet()

// Grant/Revoke form state
const grantGranter = ref(props.address)
const grantGrantee = ref('')
const grantAuthzMsgType = ref('')
const grantExpiration = ref('')
const authorizationJson = ref('')
const grantError = ref('')

const revokeGranter = ref(props.address)
const revokeGrantee = ref('')
const revokeMsgTypeUrl = ref('')
const revokeError = ref('')

// Exec form state
const execMsgsJson = ref('')
const execGrantee = ref(props.address)
const execMemo = ref('')
const execGranterForRefresh = ref('')
const execError = ref('')
const revokeErrorsByKey = ref<Record<string, string>>({})

async function refreshAsGranter() {
  if (!props.address) return
  await useAxiosRepo(Grant).api().fetchByGranter(props.address)
}
async function refreshAsGrantee() {
  if (!props.address) return
  await useAxiosRepo(Grant).api().fetchByGrantee(props.address)
}

watch(
  () => props.address,
  async (addr) => {
    if (!addr) return
    await Promise.all([refreshAsGranter(), refreshAsGrantee()])
  },
  { immediate: true }
)

function prefillGenericGrant() {
  grantAuthzMsgType.value = '/cosmos.bank.v1beta1.MsgSend'
  authorizationJson.value = ''
  grantExpiration.value = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  execMsgsJson.value = JSON.stringify(
    [
      {
        '@type': '/cosmos.bank.v1beta1.MsgSend',
        from_address: grantGranter.value || 'cosmos1...',
        to_address: grantGrantee.value || 'cosmos1...',
        amount: [{ denom: 'udys', amount: '1' }],
      },
    ],
    null,
    2
  )
}
function prefillBankSendAuthz() {
  const auth = {
    '@type': '/cosmos.bank.v1beta1.SendAuthorization',
    spend_limit: [{ denom: 'udys', amount: '1000' }],
    allow_list: [],
  }
  authorizationJson.value = JSON.stringify(auth, null, 2)
  grantAuthzMsgType.value = ''
  grantExpiration.value = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  execMsgsJson.value = JSON.stringify(
    [
      {
        '@type': '/cosmos.bank.v1beta1.MsgSend',
        from_address: grantGranter.value || 'cosmos1...',
        to_address: grantGrantee.value || 'cosmos1...',
        amount: [{ denom: 'udys', amount: '1' }],
      },
    ],
    null,
    2
  )
}
async function submitGrant() {
  grantError.value = ''
  try {
    const hasCustomAuth = authorizationJson.value.trim().length > 0
    if (hasCustomAuth) {
      const authorization = JSON.parse(authorizationJson.value)
      await useAxiosRepo(Grant)
        .api()
        .grant({
          granter: grantGranter.value,
          grantee: grantGrantee.value,
          authorization,
          expiration: grantExpiration.value,
          wallet: { sendMsg: wallet.sendMsg },
          gasLimit: 'auto',
          memo: undefined,
        })
    } else {
      await useAxiosRepo(Grant)
        .api()
        .grantGeneric({
          granter: grantGranter.value,
          grantee: grantGrantee.value,
          msgTypeUrl: grantAuthzMsgType.value,
          expiration: grantExpiration.value,
          wallet: { sendMsg: wallet.sendMsg },
          gasLimit: 'auto',
          memo: undefined,
        })
    }
  } catch (e: any) {
    console.error(e)
    grantError.value = JSON.stringify(
      {
        message: e?.message || String(e),
        data: e?.response?.data,
        code: e?.code,
        status: e?.response?.status,
        method: e?.config?.method,
        url: e?.config?.url,
      },
      null,
      2
    )
  }
}
async function submitRevoke() {
  revokeError.value = ''
  try {
    await useAxiosRepo(Grant)
      .api()
      .revoke({
        granter: revokeGranter.value,
        grantee: revokeGrantee.value,
        msgTypeUrl: revokeMsgTypeUrl.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
        memo: undefined,
      })
  } catch (e: any) {
    console.error(e)
    revokeError.value = JSON.stringify(
      {
        message: e?.message || String(e),
        data: e?.response?.data,
        code: e?.code,
        status: e?.response?.status,
        method: e?.config?.method,
        url: e?.config?.url,
      },
      null,
      2
    )
  }
}
async function submitExec() {
  execError.value = ''
  try {
    const msgs = JSON.parse(execMsgsJson.value)
    await useAxiosRepo(Grant)
      .api()
      .exec({
        grantee: execGrantee.value,
        msgs,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
        memo: execMemo.value || undefined,
        granterForRefresh: execGranterForRefresh.value || undefined,
      })
  } catch (e: any) {
    console.error(e)
    execError.value = JSON.stringify(
      {
        message: e?.message || String(e),
        data: e?.response?.data,
        code: e?.code,
        status: e?.response?.status,
        method: e?.config?.method,
        url: e?.config?.url,
      },
      null,
      2
    )
  }
}

function grantKey(g: { granter: string; grantee: string; msg_type_url: string }) {
  return `${g.granter}:${g.grantee}:${g.msg_type_url}`
}
async function revokeGrantCard(granter: string, grantee: string, msgTypeUrl: string) {
  const key = `${granter}:${grantee}:${msgTypeUrl}`
  revokeErrorsByKey.value[key] = ''
  try {
    await useAxiosRepo(Grant)
      .api()
      .revoke({
        granter,
        grantee,
        msgTypeUrl,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
        memo: undefined,
      })
  } catch (e: any) {
    console.error(e)
    revokeErrorsByKey.value[key] = JSON.stringify(
      {
        message: e?.message || String(e),
        data: e?.response?.data,
        code: e?.code,
        status: e?.response?.status,
        method: e?.config?.method,
        url: e?.config?.url,
      },
      null,
      2
    )
  }
}
</script>
