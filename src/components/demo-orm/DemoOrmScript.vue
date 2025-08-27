<template>
  <h2 class="text-xl font-semibold" id="script">Script</h2>
  <section class="grid gap-6 md:grid-cols-3">
    <div class="space-y-4 p-4 border rounded">
      <h3 class="font-semibold">Queries</h3>
      <div class="space-y-2">
        <div class="space-y-2">
          <h4 class="text-sm font-semibold opacity-70">Script Info</h4>
          <input v-model="infoAddress" class="input w-full" placeholder="script address" />
          <button class="btn btn-primary" @click="fetchInfo">Fetch</button>
          <div class="text-xs opacity-70 grid grid-cols-2 gap-x-2">
            <div>
              version=<code>{{ scriptVersion }}</code>
            </div>
            <div>
              height=<code>{{ scriptHeight }}</code>
            </div>
          </div>
          <div v-if="infoError" class="text-sm text-red-600">{{ infoError }}</div>
          <div v-if="infoErrorData" class="text-xs opacity-70">
            <code class="break-words">{{ infoErrorData }}</code>
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="text-sm font-semibold opacity-70">Params</h4>
          <button class="btn btn-primary" @click="fetchParams">Fetch</button>
          <div class="text-xs opacity-70 grid grid-cols-2 gap-x-2">
            <div>
              max_rel=<code>{{ params.max_relative_historical_blocks }}</code>
            </div>
            <div>
              abs_cutoff=<code>{{ params.absolute_historical_block_cutoff }}</code>
            </div>
          </div>
          <div v-if="paramsError" class="text-sm text-red-600">{{ paramsError }}</div>
          <div v-if="paramsErrorData" class="text-xs opacity-70">
            <code class="break-words">{{ paramsErrorData }}</code>
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="text-sm font-semibold opacity-70">Encode JSON</h4>
          <textarea
            v-model="encJson"
            class="textarea w-full"
            placeholder='{"foo":"bar"}'
            rows="6"
          ></textarea>
          <button class="btn" @click="doEncode">Encode</button>
          <div class="text-xs opacity-70">
            bytes=<code class="break-words">{{ encBytes }}</code>
          </div>
          <div v-if="encError" class="text-sm text-red-600">{{ encError }}</div>
          <div v-if="encErrorData" class="text-xs opacity-70">
            <code class="break-words">{{ encErrorData }}</code>
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="text-sm font-semibold opacity-70">Decode Bytes</h4>
          <input v-model="decTypeUrl" class="input w-full" placeholder="type_url" />
          <input v-model="decBytes" class="input w-full" placeholder="base64 bytes" />
          <button class="btn" @click="doDecode">Decode</button>
          <div class="text-xs opacity-70">
            json=<code class="break-words">{{ decJson }}</code>
          </div>
          <div v-if="decError" class="text-sm text-red-600">{{ decError }}</div>
          <div v-if="decErrorData" class="text-xs opacity-70">
            <code class="break-words">{{ decErrorData }}</code>
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="text-sm font-semibold opacity-70">Sign Arbitrary Data</h4>
          <input v-model="signAddress" class="input w-full" placeholder="signer address" />
          <textarea
            v-model="signData"
            class="textarea w-full"
            rows="4"
            placeholder="data to sign"
          />
          <textarea
            v-model="signMsg"
            class="textarea w-full"
            rows="6"
            placeholder='optional full msg JSON (overrides data), e.g. {"@type":"/dysonprotocol.script.v1.MsgArbitraryData","signer":"...","data":"...","app_domain":"dysond"}'
          />
          <button class="btn" @click="doSignArbitrary">Sign</button>
          <div class="text-xs opacity-70">
            tx=<code class="break-words">{{ signResult }}</code>
          </div>
          <div v-if="signError" class="text-sm text-red-600">{{ signError }}</div>
          <div v-if="signErrorData" class="text-xs opacity-70">
            <code class="break-words">{{ signErrorData }}</code>
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="text-sm font-semibold opacity-70">Verify Tx</h4>
          <input v-model="txJson" class="input w-full" placeholder='{"body":...}' />
          <button class="btn" @click="doVerify">Verify</button>
          <div class="text-xs opacity-70">
            signer=<code>{{ signer }}</code>
          </div>
          <div v-if="verifyError" class="text-sm text-red-600">{{ verifyError }}</div>
          <div v-if="verifyErrorData" class="text-xs opacity-70">
            <code class="break-words">{{ verifyErrorData }}</code>
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="text-sm font-semibold opacity-70">Web</h4>
          <input v-model="webAddress" class="input w-full" placeholder="script address" />
          <input v-model="webName" class="input w-full" placeholder="script name (optional)" />
          <textarea v-model="webRequest" class="textarea w-full" placeholder="httprequest" />
          <button class="btn" @click="doWeb">Call</button>
          <div class="text-xs opacity-70">
            resp=<code class="break-words">{{ webResponse }}</code>
          </div>
          <div v-if="webError" class="text-sm text-red-600">{{ webError }}</div>
          <div v-if="webErrorData" class="text-xs opacity-70">
            <code class="break-words">{{ webErrorData }}</code>
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="text-sm font-semibold opacity-70">Run</h4>
          <input v-model="runExec" class="input w-full" placeholder="executor" />
          <input v-model="runAddress" class="input w-full" placeholder="script address" />
          <input v-model="runName" class="input w-full" placeholder="script name (optional)" />
          <input v-model="runFunc" class="input w-full" placeholder="function name" />
          <input v-model="runArgs" class="input w-full" placeholder="args JSON []" />
          <input v-model="runKwargs" class="input w-full" placeholder="kwargs JSON {}" />
          <textarea
            v-model="runExtra"
            class="textarea w-full"
            rows="4"
            placeholder="extra_code (optional)"
          />
          <button class="btn" @click="doRun">Run</button>
          <div class="text-xs opacity-70">
            result=<code class="break-words">{{ runResult }}</code>
          </div>
          <div v-if="runError" class="text-sm text-red-600">{{ runError }}</div>
          <div v-if="runErrorData" class="text-xs opacity-70">
            <code class="break-words">{{ runErrorData }}</code>
          </div>
        </div>
      </div>
    </div>

    <div class="space-y-4 p-4 border rounded">
      <h3 class="font-semibold">Actions</h3>
      <div class="space-y-2">
        <h4 class="text-sm font-semibold opacity-70">Update Script</h4>
        <input v-model="updAddress" class="input w-full" placeholder="script address" />
        <textarea v-model="updCode" class="textarea w-full" placeholder="code" />
        <input v-model="updMemo" class="input w-full" placeholder="memo (optional)" />
        <button class="btn btn-primary" @click="updateScript">Update</button>
        <div v-if="updError" class="text-sm text-red-600">{{ updError }}</div>
        <div v-if="updErrorData" class="text-xs opacity-70">
          <code class="break-words">{{ updErrorData }}</code>
        </div>
      </div>

      <div class="space-y-2">
        <h4 class="text-sm font-semibold opacity-70">Exec Script</h4>
        <input v-model="execAddress" class="input w-full" placeholder="executor" />
        <input v-model="execScriptAddr" class="input w-full" placeholder="script address" />
        <input v-model="execScriptName" class="input w-full" placeholder="script name (optional)" />
        <input v-model="execFunc" class="input w-full" placeholder="function" />
        <input v-model="execArgs" class="input w-full" placeholder="args JSON []" />
        <input v-model="execKwargs" class="input w-full" placeholder="kwargs JSON {}" />
        <input v-model="execMemo" class="input w-full" placeholder="memo (optional)" />
        <button class="btn btn-primary" @click="execScript">Exec</button>
        <div v-if="execError" class="text-sm text-red-600">{{ execError }}</div>
        <div v-if="execErrorData" class="text-xs opacity-70">
          <code class="break-words">{{ execErrorData }}</code>
        </div>
      </div>

      <div class="space-y-2">
        <h4 class="text-sm font-semibold opacity-70">Create New Script</h4>
        <input v-model="newCreator" class="input w-full" placeholder="creator address" />
        <textarea v-model="newCode" class="textarea w-full" placeholder="code" />
        <input v-model="newMemo" class="input w-full" placeholder="memo (optional)" />
        <button class="btn btn-primary" @click="createNewScript">Create</button>
        <div v-if="newError" class="text-sm text-red-600">{{ newError }}</div>
        <div v-if="newErrorData" class="text-xs opacity-70">
          <code class="break-words">{{ newErrorData }}</code>
        </div>
      </div>

      <div class="space-y-2">
        <h4 class="text-sm font-semibold opacity-70">Update Params</h4>
        <input v-model="paramsAuthority" class="input w-full" placeholder="authority" />
        <textarea
          v-model="paramsPayload"
          class="textarea w-full"
          placeholder='{"max_relative_historical_blocks":"1000"}'
        />
        <input v-model="paramsMemo" class="input w-full" placeholder="memo (optional)" />
        <button class="btn btn-primary" @click="updateParams">Update</button>
        <div v-if="paramsSendError" class="text-sm text-red-600">{{ paramsSendError }}</div>
        <div v-if="paramsSendErrorData" class="text-xs opacity-70">
          <code class="break-words">{{ paramsSendErrorData }}</code>
        </div>
      </div>
    </div>

    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">In-memory</h3>
      <div class="text-sm opacity-70">
        count: <code>{{ scriptsCount }}</code>
      </div>
      <div class="overflow-x-auto">
        <table class="table table-xs w-full">
          <thead>
            <tr>
              <th>address</th>
              <th>version</th>
              <th>height</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in scriptsList" :key="s.address">
              <td class="font-mono">{{ s.address }}</td>
              <td>
                <code>{{ s.version }}</code>
              </td>
              <td>
                <code>{{ s.update_height }}</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useWallet } from '../../composables/useWallet'
import Script from '../../orm/models/script/Script'
import ScriptParams from '../../orm/models/script/Params'

const wallet = useWallet()

const scriptRepo = useRepo(Script)
const paramsRepo = useRepo(ScriptParams)

// Script info
const infoAddress = ref('')
const infoError = ref('')
const infoErrorData = ref('')
const scriptVersion = computed(() => (scriptRepo.find(infoAddress.value) as any)?.version || '')
const scriptHeight = computed(
  () => (scriptRepo.find(infoAddress.value) as any)?.update_height || ''
)
async function fetchInfo() {
  infoError.value = ''
  try {
    const addr = infoAddress.value.trim()
    if (!addr) throw new Error('address required')
    await useAxiosRepo(Script).api().fetchInfo(addr)
  } catch (e: any) {
    console.error(e)
    infoError.value = e?.message || String(e)
    infoErrorData.value = formatErrorData(e)
  }
}

// Params
const paramsError = ref('')
const paramsErrorData = ref('')
const params = computed(
  () =>
    (paramsRepo.find('default') as any) || {
      max_relative_historical_blocks: '',
      absolute_historical_block_cutoff: '',
    }
)
async function fetchParams() {
  paramsError.value = ''
  try {
    await useAxiosRepo(Script).api().fetchParams()
  } catch (e: any) {
    console.error(e)
    paramsError.value = e?.message || String(e)
    paramsErrorData.value = formatErrorData(e)
  }
}

// Encode/Decode
const encJson = ref(
  JSON.stringify(
    {
      '@type': '/dysonprotocol.script.v1.MsgArbitraryData',
      signer: '',
      data: '',
      app_domain: '',
    },
    null,
    2
  )
)
const encBytes = ref('')
const decTypeUrl = ref('')
const decBytes = ref('')
const decJson = ref('')
const encError = ref('')
const encErrorData = ref('')
const decError = ref('')
const decErrorData = ref('')
async function doEncode() {
  encError.value = ''
  encErrorData.value = ''
  encBytes.value = ''
  try {
    encBytes.value = String(await useAxiosRepo(Script).api().encodeJson(encJson.value))
    // Auto-fill Decode form inputs from the Encode result
    // Parse @type from the encode JSON textarea if present
    try {
      const parsed = JSON.parse(encJson.value || '{}') as { ['@type']?: string }
      decTypeUrl.value = String(parsed?.['@type'] || '')
    } catch {
      decTypeUrl.value = ''
    }
    decBytes.value = encBytes.value
  } catch (e: any) {
    console.error(e)
    encError.value = e?.message || String(e)
    encErrorData.value = formatErrorData(e)
  }
}
async function doDecode() {
  decError.value = ''
  decErrorData.value = ''
  decJson.value = ''
  const bytes = decBytes.value
  if (!bytes) return
  try {
    decJson.value = await useAxiosRepo(Script)
      .api()
      .decodeBytes({ type_url: decTypeUrl.value || '', bytes })
  } catch (e: any) {
    console.error(e)
    decError.value = e?.message || String(e)
    decErrorData.value = formatErrorData(e)
  }
}

// Sign Arbitrary
const signAddress = ref('')
const signData = ref('')
const signMsg = ref('')
const signResult = ref('')
const signError = ref('')
const signErrorData = ref('')
async function doSignArbitrary() {
  signError.value = ''
  signErrorData.value = ''
  signResult.value = ''
  try {
    const activeAddr = await wallet.getSignerAddress()
    const desired = (signAddress.value || '').trim()
    if (desired && desired !== activeAddr) {
      throw new Error(
        `Active wallet ${activeAddr} does not match input ${desired}. Switch wallet or clear the address field.`
      )
    }
    const msg = (() => {
      const raw = (signMsg.value || '').trim()
      if (!raw) return null
      try {
        return JSON.parse(raw)
      } catch {
        throw new Error('Invalid JSON in optional msg')
      }
    })()
    const tx = await wallet.signArbitraryData({ address: activeAddr, data: signData.value, msg })
    signResult.value = JSON.stringify(tx)
    // Auto-fill Verify Tx with the signed transaction JSON
    txJson.value = signResult.value
  } catch (e: any) {
    console.error(e)
    signError.value = e?.message || String(e)
    signErrorData.value = formatErrorData(e)
  }
}

// VerifyTx
const txJson = ref('')
const signer = ref('')
const verifyError = ref('')
const verifyErrorData = ref('')
async function doVerify() {
  verifyError.value = ''
  verifyErrorData.value = ''
  signer.value = ''
  try {
    signer.value = await useAxiosRepo(Script).api().verifyTx(txJson.value)
  } catch (e: any) {
    console.error(e)
    verifyError.value = e?.message || String(e)
    verifyErrorData.value = formatErrorData(e)
  }
}

// Web
const webAddress = ref('')
const webName = ref('')
const webRequest = ref('')
const webResponse = ref('')
const webError = ref('')
const webErrorData = ref('')
async function doWeb() {
  webError.value = ''
  webErrorData.value = ''
  webResponse.value = ''
  try {
    webResponse.value = await useAxiosRepo(Script)
      .api()
      .web({
        script_address: webAddress.value,
        script_name: webName.value || undefined,
        httprequest: webRequest.value,
      })
  } catch (e: any) {
    console.error(e)
    webError.value = e?.message || String(e)
    webErrorData.value = formatErrorData(e)
  }
}

// Run
const runExec = ref('')
const runAddress = ref('')
const runName = ref('')
const runFunc = ref('')
const runArgs = ref('[]')
const runKwargs = ref('{}')
const runExtra = ref('')
const runResult = ref('')
const runError = ref('')
const runErrorData = ref('')
async function doRun() {
  runError.value = ''
  runErrorData.value = ''
  runResult.value = ''
  try {
    const args = JSON.parse(runArgs.value || '[]')
    const kwargs = JSON.parse(runKwargs.value || '{}')
    runResult.value = await useAxiosRepo(Script)
      .api()
      .run({
        executor_address: runExec.value,
        script_address: runAddress.value,
        script_name: runName.value || undefined,
        function_name: runFunc.value,
        extra_code: runExtra.value || undefined,
        args,
        kwargs,
      })
  } catch (e: any) {
    console.error(e)
    runError.value = e?.message || String(e)
    runErrorData.value = formatErrorData(e)
  }
}

// Actions
const updAddress = ref('')
const updCode = ref('')
const updMemo = ref('')
const updError = ref('')
const updErrorData = ref('')
async function updateScript() {
  updError.value = ''
  updErrorData.value = ''
  try {
    await useAxiosRepo(Script)
      .api()
      .updateScript({
        address: updAddress.value,
        code: updCode.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
        memo: updMemo.value || undefined,
      })
  } catch (e: any) {
    console.error(e)
    updError.value = e?.message || String(e)
    updErrorData.value = formatErrorData(e)
  }
}

const execAddress = ref('')
const execScriptAddr = ref('')
const execScriptName = ref('')
const execFunc = ref('')
const execArgs = ref('[]')
const execKwargs = ref('{}')
const execMemo = ref('')
const execError = ref('')
const execErrorData = ref('')
async function execScript() {
  execError.value = ''
  execErrorData.value = ''
  try {
    await useAxiosRepo(Script)
      .api()
      .exec({
        executor_address: execAddress.value,
        script_address: execScriptAddr.value || undefined,
        script_name: execScriptName.value || undefined,
        function_name: execFunc.value,
        args: execArgs.value,
        kwargs: execKwargs.value,
        memo: execMemo.value || undefined,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
  } catch (e: any) {
    console.error(e)
    execError.value = e?.message || String(e)
    execErrorData.value = formatErrorData(e)
  }
}

const newCreator = ref('')
const newCode = ref('')
const newMemo = ref('')
const newError = ref('')
const newErrorData = ref('')
async function createNewScript() {
  newError.value = ''
  newErrorData.value = ''
  try {
    await useAxiosRepo(Script)
      .api()
      .createNewScript({
        creator_address: newCreator.value,
        code: newCode.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
        memo: newMemo.value || undefined,
      })
  } catch (e: any) {
    console.error(e)
    newError.value = e?.message || String(e)
    newErrorData.value = formatErrorData(e)
  }
}

const paramsAuthority = ref('')
const paramsPayload = ref('')
const paramsMemo = ref('')
const paramsSendError = ref('')
const paramsSendErrorData = ref('')
async function updateParams() {
  paramsSendError.value = ''
  paramsSendErrorData.value = ''
  try {
    const payload = JSON.parse(paramsPayload.value || '{}')
    await useAxiosRepo(Script)
      .api()
      .updateParams({
        authority: paramsAuthority.value,
        params: payload,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
        memo: paramsMemo.value || undefined,
      })
  } catch (e: any) {
    console.error(e)
    paramsSendError.value = e?.message || String(e)
    paramsSendErrorData.value = formatErrorData(e)
  }
}

// In-memory
const scriptsCount = computed(() => scriptRepo.all().length)
const scriptsList = computed(() =>
  scriptRepo
    .all()
    .map((s: any) => ({ address: s.address, version: s.version, update_height: s.update_height }))
)

function formatErrorData(e: any): string {
  try {
    const raw = e?.response?.data ?? e?.data ?? e
    return typeof raw === 'string' ? raw : JSON.stringify(raw)
  } catch {
    return String(e)
  }
}
</script>
