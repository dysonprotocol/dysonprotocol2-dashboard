<template>
  <h2
    id="account"
    class="text-xl font-semibold"
  >
    Account
  </h2>
  <section class="grid gap-6 md:grid-cols-3">
    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">
        Account
      </h3>
      <div class="grid gap-2 md:grid-cols-3">
        <input
          v-model="address"
          class="input w-full"
          placeholder="address"
        >
        <button
          class="btn btn-primary"
          @click="loadAccountInfo"
        >
          Account Info
        </button>
        <button
          class="btn btn-primary"
          @click="loadAccountDetails"
        >
          Account
        </button>
      </div>
      <div class="text-sm">
        <div v-if="account">
          account_number: <code>{{ account.account_number }}</code>, sequence:
          <code>{{ account.sequence }}</code>
        </div>
        <div
          v-else
          class="opacity-70"
        >
          No account loaded
        </div>
      </div>
    </div>

    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">
        Auth Params
      </h3>
      <button
        class="btn btn-primary"
        @click="loadAuthParams"
      >
        Load Params
      </button>
      <div class="text-sm">
        <div>
          max_memo_characters: <code>{{ authParams?.max_memo_characters }}</code>
        </div>
        <div>
          tx_sig_limit: <code>{{ authParams?.tx_sig_limit }}</code>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import BaseAccount from '@/orm/models/auth/BaseAccount'
import AuthParams from '@/orm/models/auth/AuthParams'

const address = ref('')

const accountRepo = useRepo(BaseAccount)
const authParamsRepo = useRepo(AuthParams)

const account = computed(() =>
  address.value ? accountRepo.where('address', address.value).first() : null
)
const authParams = computed(() => authParamsRepo.first())

async function loadAccountInfo() {
  if (!address.value) return
  await useAxiosRepo(BaseAccount).api().fetchAccountInfo(address.value)
}
async function loadAccountDetails() {
  if (!address.value) return
  await useAxiosRepo(BaseAccount).api().fetchAccount(address.value)
}
async function loadAuthParams() {
  await useAxiosRepo(AuthParams).api().fetchParams()
}
</script>
