<template>
  <h2
    id="authz"
    class="text-xl font-semibold"
  >
    Authz
  </h2>
  <section class="grid gap-6 md:grid-cols-3">
    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">
        Authz: Grants
      </h3>
      <div class="grid gap-2 md:grid-cols-2">
        <input
          v-model="listGranter"
          class="input w-full"
          placeholder="granter address"
        >
        <input
          v-model="listGrantee"
          class="input w-full"
          placeholder="grantee address"
        >
      </div>
      <input
        v-model="listMsgType"
        class="input w-full"
        placeholder="msg_type_url (optional)"
      >
      <div class="flex gap-2">
        <button
          class="btn btn-primary"
          @click="loadAuthzGrants"
        >
          List Grants
        </button>
        <button
          class="btn btn-primary"
          @click="loadAuthzByGranter"
        >
          By Granter
        </button>
        <button
          class="btn btn-primary"
          @click="loadAuthzByGrantee"
        >
          By Grantee
        </button>
      </div>
      <ul class="list-disc pl-6 text-sm max-h-56 overflow-auto">
        <li
          v-for="g in grantsByAddress"
          :key="g.granter + ':' + g.grantee + ':' + g.msg_type_url"
        >
          <span class="font-mono">{{ g.granter }}</span> →
          <span class="font-mono">{{ g.grantee }}</span>
          <div class="opacity-70">
            auth: <code>{{ g.type_url }}</code> msg: <code>{{ g.msg_type_url }}</code>
          </div>
          <div class="opacity-70">
            exp: {{ g.expiration }}
          </div>
        </li>
      </ul>
      <div
        v-if="listError"
        class="text-sm text-red-600"
      >
        {{ listError }}
      </div>
    </div>

    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">
        Authz: Grant
      </h3>
      <div class="grid gap-2 md:grid-cols-2">
        <input
          v-model="grantGranter"
          class="input w-full"
          placeholder="granter address"
        >
        <input
          v-model="grantGrantee"
          class="input w-full"
          placeholder="grantee address"
        >
      </div>
      <input
        v-model="grantExpiration"
        class="input w-full"
        placeholder="expiration RFC3339"
      >
      <input
        v-model="grantAuthzMsgType"
        class="input w-full"
        placeholder="msg_type_url (for Generic)"
      >
      <textarea
        v-model="authorizationJson"
        class="input w-full h-24"
        placeholder="authorization JSON (optional; if set, used instead of Generic)"
      />
      <div class="flex gap-2">
        <button
          class="btn btn-primary"
          @click="prefillGenericGrant"
        >
          Prefill Generic (MsgSend)
        </button>
        <button
          class="btn btn-primary"
          @click="prefillBankSendAuthz"
        >
          Prefill Bank SendAuthorization
        </button>
      </div>
      <div class="flex gap-2">
        <button
          class="btn btn-primary"
          @click="submitGrant"
        >
          Grant
        </button>
      </div>
      <div
        v-if="grantError"
        class="text-sm text-red-600"
      >
        {{ grantError }}
      </div>
    </div>

    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">
        Authz: Revoke
      </h3>
      <div class="grid gap-2 md:grid-cols-2">
        <input
          v-model="revokeGranter"
          class="input w-full"
          placeholder="granter address"
        >
        <input
          v-model="revokeGrantee"
          class="input w-full"
          placeholder="grantee address"
        >
      </div>
      <input
        v-model="revokeMsgTypeUrl"
        class="input w-full"
        placeholder="msg_type_url"
      >
      <div class="flex gap-2">
        <button
          class="btn btn-primary"
          @click="submitRevoke"
        >
          Revoke
        </button>
      </div>
      <div
        v-if="revokeError"
        class="text-sm text-red-600"
      >
        {{ revokeError }}
      </div>
    </div>
    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">
        Authz: Exec
      </h3>

      <textarea
        v-model="execMsgsJson"
        class="input w-full h-24"
        placeholder="exec msgs JSON array"
      />
      <input
        v-model="execGrantee"
        class="input w-full"
        placeholder="grantee address"
      >
      <input
        v-model="execMemo"
        class="input w-full"
        placeholder="exec memo (optional)"
      >
      <input
        v-model="execGranterForRefresh"
        class="input w-full"
        placeholder="granter for refresh (optional)"
      >
      <button
        class="btn btn-primary"
        @click="submitExec"
      >
        Exec
      </button>
      <div
        v-if="execError"
        class="text-sm text-red-600"
      >
        {{ execError }}
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import Grant from '@/orm/models/authz/Grant'
import { useWallet } from '@/composables/useWallet'

const wallet = useWallet()

const grantRepo = useRepo(Grant)
const grantsByAddress = computed(() => grantRepo.all())

// List Grants form state
const listGranter = ref('')
const listGrantee = ref('')
const listMsgType = ref('')
const listError = ref('')

// Grant/Revoke form state
const grantGranter = ref('')
const grantGrantee = ref('')
const grantAuthzMsgType = ref('')
const grantExpiration = ref('')
const authorizationJson = ref('')
const grantError = ref('')

// Revoke form state
const revokeGranter = ref('')
const revokeGrantee = ref('')
const revokeMsgTypeUrl = ref('')
const revokeError = ref('')

// Exec form state
const execMsgsJson = ref('')
const execGrantee = ref('')
const execMemo = ref('')
const execGranterForRefresh = ref('')
const execError = ref('')

async function loadAuthzGrants() {
  listError.value = ''
  await useAxiosRepo(Grant)
    .api()
    .fetchGrants({
      granter: listGranter.value,
      grantee: listGrantee.value,
      msgTypeUrl: listMsgType.value || undefined,
    })
    .catch((e: any) => {
      console.error(e)
      listError.value = JSON.stringify(
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
    })
}
async function loadAuthzByGranter() {
  listError.value = ''
  await useAxiosRepo(Grant)
    .api()
    .fetchByGranter(listGranter.value)
    .catch((e: any) => {
      console.error(e)
      listError.value = JSON.stringify(
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
    })
}
async function loadAuthzByGrantee() {
  listError.value = ''
  await useAxiosRepo(Grant)
    .api()
    .fetchByGrantee(listGrantee.value)
    .catch((e: any) => {
      console.error(e)
      listError.value = JSON.stringify(
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
    })
}

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
</script>
