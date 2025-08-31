<template>
  <h2 id="nameservice" class="text-xl font-semibold">Nameservice</h2>
  <section class="grid gap-6 md:grid-cols-3">
    <div class="space-y-4 p-4 border rounded">
      <h3 class="font-semibold">Queries</h3>
      <div class="space-y-2">
        <!-- Queries only: read-only blocks below -->

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Create External Name</div>
          <input v-model="extAuthority" class="input w-full" placeholder="authority" />
          <input v-model="extName" class="input w-full" placeholder="name (e.g. example.com)" />
          <button class="btn btn-primary" @click="createExternalName">Send</button>
          <div v-if="extError" class="text-sm text-red-600">{{ extError }}</div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Set NFT Metadata</div>
          <input v-model="nftMetaDest" class="input w-full" placeholder="name_destination" />
          <input v-model="nftMetaClass" class="input w-full" placeholder="class_id" />
          <input v-model="nftMetaId" class="input w-full" placeholder="nft_id" />
          <input v-model="nftMeta" class="input w-full" placeholder="metadata (optional)" />
          <input v-model="nftUri" class="input w-full" placeholder="uri (optional)" />
          <input v-model="nftUriHash" class="input w-full" placeholder="uri_hash (optional)" />
          <button class="btn btn-primary" @click="setNftMetadata">Send</button>
          <div v-if="nftMetaError" class="text-sm text-red-600">{{ nftMetaError }}</div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Set Class Extra Data</div>
          <input v-model="classDest" class="input w-full" placeholder="name_destination" />
          <input v-model="classId" class="input w-full" placeholder="class_id" />
          <input v-model="classExtra" class="input w-full" placeholder="extra_data" />
          <button class="btn btn-primary" @click="setClassExtra">Send</button>
          <div v-if="classExtraError" class="text-sm text-red-600">{{ classExtraError }}</div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Set Class Always Listed</div>
          <input v-model="classDest2" class="input w-full" placeholder="name_destination" />
          <input v-model="classId2" class="input w-full" placeholder="class_id" />
          <select v-model="classAlwaysListed" class="select select-bordered w-full">
            <option :value="true">true</option>
            <option :value="false">false</option>
          </select>
          <button class="btn btn-primary" @click="setClassAlwaysListed">Send</button>
          <div v-if="classAlwaysError" class="text-sm text-red-600">{{ classAlwaysError }}</div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Set Class Valuation Fee Pct</div>
          <input v-model="classDest3" class="input w-full" placeholder="name_destination" />
          <input v-model="classId3" class="input w-full" placeholder="class_id" />
          <input
            v-model="classValFeePct"
            class="input w-full"
            placeholder="valuation_fee_pct (Dec)"
          />
          <button class="btn btn-primary" @click="setClassValFeePct">Send</button>
          <div v-if="classValFeeError" class="text-sm text-red-600">{{ classValFeeError }}</div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Set Class Valuation Period</div>
          <input v-model="classDest4" class="input w-full" placeholder="name_destination" />
          <input v-model="classId4" class="input w-full" placeholder="class_id" />
          <input v-model="classValPeriodSec" class="input w-full" placeholder="seconds" />
          <button class="btn btn-primary" @click="setClassValPeriod">Send</button>
          <div v-if="classValPeriodError" class="text-sm text-red-600">
            {{ classValPeriodError }}
          </div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Set Class Bid Timeout</div>
          <input v-model="classDest5" class="input w-full" placeholder="name_destination" />
          <input v-model="classId5" class="input w-full" placeholder="class_id" />
          <input v-model="classBidTimeoutSec" class="input w-full" placeholder="seconds" />
          <button class="btn btn-primary" @click="setClassBidTimeout">Send</button>
          <div v-if="classBidTimeoutError" class="text-sm text-red-600">
            {{ classBidTimeoutError }}
          </div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Set Class Allowed Denoms</div>
          <input v-model="classDest6" class="input w-full" placeholder="name_destination" />
          <input v-model="classId6" class="input w-full" placeholder="class_id" />
          <input
            v-model="classAllowedDenoms"
            class="input w-full"
            placeholder="denoms (comma-separated)"
          />
          <button class="btn btn-primary" @click="setClassAllowedDenoms">Send</button>
          <div v-if="classAllowedDenomsError" class="text-sm text-red-600">
            {{ classAllowedDenomsError }}
          </div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Set Class Reject Fee Percent</div>
          <input v-model="classDest7" class="input w-full" placeholder="name_destination" />
          <input v-model="classId7" class="input w-full" placeholder="class_id" />
          <input
            v-model="classRejectFeePct"
            class="input w-full"
            placeholder="reject fee percent (Dec)"
          />
          <button class="btn btn-primary" @click="setClassRejectFeePct">Send</button>
          <div v-if="classRejectFeeError" class="text-sm text-red-600">
            {{ classRejectFeeError }}
          </div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Set Class Minimum Bid Increase</div>
          <input v-model="classDest8" class="input w-full" placeholder="name_destination" />
          <input v-model="classId8" class="input w-full" placeholder="class_id" />
          <input
            v-model="classMinBidIncPct"
            class="input w-full"
            placeholder="min bid increase percent (Dec)"
          />
          <button class="btn btn-primary" @click="setClassMinBidIncPct">Send</button>
          <div v-if="classMinBidIncError" class="text-sm text-red-600">
            {{ classMinBidIncError }}
          </div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Set Listed</div>
          <input v-model="listedOwner" class="input w-full" placeholder="nft_owner" />
          <input v-model="listedClassId" class="input w-full" placeholder="nft_class_id" />
          <input v-model="listedNftId" class="input w-full" placeholder="nft_id" />
          <select v-model="listedFlag" class="select select-bordered w-full">
            <option :value="true">true</option>
            <option :value="false">false</option>
          </select>
          <button class="btn btn-primary" @click="setListed">Send</button>
          <div v-if="listedError" class="text-sm text-red-600">{{ listedError }}</div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Update Params</div>
          <input v-model="updAuthority" class="input w-full" placeholder="authority" />
          <input
            v-model="updParamsJson"
            class="input w-full"
            placeholder='params JSON (e.g. {"min_valuation_fee_pct":"0.01"})'
          />
          <button class="btn btn-primary" @click="updateParams">Send</button>
          <div v-if="updError" class="text-sm text-red-600">{{ updError }}</div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Burn Coins</div>
          <input v-model="burnDest" class="input w-full" placeholder="name_destination" />
          <input
            v-model="burnAmountJson"
            class="input w-full"
            placeholder='amount JSON array (e.g. [{"denom":"udys","amount":"10"}])'
          />
          <button class="btn btn-primary" @click="burnCoins">Send</button>
          <div v-if="burnError" class="text-sm text-red-600">{{ burnError }}</div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Set Denom Metadata</div>
          <input v-model="denomMetaAuthority" class="input w-full" placeholder="authority" />
          <input v-model="denomMetadataJson" class="input w-full" placeholder="metadata JSON" />
          <button class="btn btn-primary" @click="setDenomMetadata">Send</button>
          <div v-if="denomMetaError" class="text-sm text-red-600">{{ denomMetaError }}</div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Set Denom Description</div>
          <input v-model="denDescDest" class="input w-full" placeholder="name_destination" />
          <input v-model="denDescDenom" class="input w-full" placeholder="denom" />
          <input v-model="denDescText" class="input w-full" placeholder="description" />
          <button class="btn btn-primary" @click="setDenomDescription">Send</button>
          <div v-if="denDescError" class="text-sm text-red-600">{{ denDescError }}</div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Set Denom URI</div>
          <input v-model="denUriDest" class="input w-full" placeholder="name_destination" />
          <input v-model="denUriDenom" class="input w-full" placeholder="denom" />
          <input v-model="denUri" class="input w-full" placeholder="uri (optional)" />
          <input v-model="denUriHash" class="input w-full" placeholder="uri_hash (optional)" />
          <button class="btn btn-primary" @click="setDenomURI">Send</button>
          <div v-if="denUriError" class="text-sm text-red-600">{{ denUriError }}</div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Delete Class</div>
          <input v-model="delClassDest" class="input w-full" placeholder="name_destination" />
          <input v-model="delClassId" class="input w-full" placeholder="class_id" />
          <button class="btn btn-primary" @click="deleteClass">Send</button>
          <div v-if="delClassError" class="text-sm text-red-600">{{ delClassError }}</div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Mint NFT</div>
          <input v-model="mintDest" class="input w-full" placeholder="name_destination" />
          <input v-model="mintClassId" class="input w-full" placeholder="class_id" />
          <input v-model="mintNftId" class="input w-full" placeholder="nft_id" />
          <input v-model="mintUri" class="input w-full" placeholder="uri (optional)" />
          <input v-model="mintUriHash" class="input w-full" placeholder="uri_hash (optional)" />
          <button class="btn btn-primary" @click="mintNft">Send</button>
          <div v-if="mintError" class="text-sm text-red-600">{{ mintError }}</div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Burn NFT</div>
          <input v-model="burnNftDest" class="input w-full" placeholder="name_destination" />
          <input v-model="burnNftClassId" class="input w-full" placeholder="class_id" />
          <input v-model="burnNftId" class="input w-full" placeholder="nft_id" />
          <button class="btn btn-primary" @click="burnNft">Send</button>
          <div v-if="burnNftError" class="text-sm text-red-600">{{ burnNftError }}</div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Move Coins</div>
          <input v-model="moveCoinsDest" class="input w-full" placeholder="name_destination" />
          <input v-model="moveCoinsInputsJson" class="input w-full" placeholder="inputs JSON" />
          <input v-model="moveCoinsOutputsJson" class="input w-full" placeholder="outputs JSON" />
          <button class="btn btn-primary" @click="moveCoins">Send</button>
          <div v-if="moveCoinsError" class="text-sm text-red-600">{{ moveCoinsError }}</div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Move NFT</div>
          <input v-model="moveNftDest" class="input w-full" placeholder="name_destination" />
          <input v-model="moveNftClassId" class="input w-full" placeholder="class_id" />
          <input v-model="moveNftId" class="input w-full" placeholder="nft_id" />
          <input v-model="moveNftTo" class="input w-full" placeholder="to_address" />
          <button class="btn btn-primary" @click="moveNft">Send</button>
          <div v-if="moveNftError" class="text-sm text-red-600">{{ moveNftError }}</div>
        </div>
        <div class="space-y-2">
          <h4 class="text-sm font-semibold opacity-70">Resolve Name</h4>
          <input v-model="resolveInput" class="input w-full" placeholder="name or address" />
          <button class="btn btn-primary" @click="resolveName">Resolve</button>
          <div class="text-sm">
            address=<code>{{ resolvedAddress }}</code>
          </div>
          <div v-if="resolveError" class="text-sm text-red-600">
            {{ resolveError }}
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="text-sm font-semibold opacity-70">Compute Hash</h4>
          <input v-model="regCommitter" class="input w-full" placeholder="committer" />
          <input v-model="regName" class="input w-full" placeholder="name" />
          <input v-model="regSalt" class="input w-full" placeholder="salt" />
          <div class="flex gap-2 items-center">
            <button class="btn btn-primary" @click="computeHash">ComputeHash</button>
            <span class="text-xs font-mono truncate">{{ regHexhash }}</span>
          </div>
          <div v-if="regError" class="text-sm text-red-600">
            {{ regError }}
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="text-sm font-semibold opacity-70">Names by Destination</h4>
          <input v-model="destInput" class="input w-full" placeholder="destination address" />
          <div class="flex gap-2">
            <button class="btn btn-primary" @click="resolveAllNamesForDestination">Init</button>
          </div>
          <div class="text-sm">
            count=<code>{{ namesByDestCount }}</code>
          </div>
          <div v-if="namesError" class="text-sm text-red-600">
            {{ namesError }}
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="text-sm font-semibold opacity-70">Names by Owner</h4>
          <input v-model="namesOwner" class="input w-full" placeholder="owner address" />
          <div class="flex gap-2">
            <button class="btn btn-primary" @click="fetchNamesByOwner">Init</button>
          </div>
          <div class="text-sm">
            count=<code>{{ namesForOwnerCount }}</code>
          </div>
          <div v-if="namesByOwnerError" class="text-sm text-red-600">
            {{ namesByOwnerError }}
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="text-sm font-semibold opacity-70">Classes by Name</h4>
          <input
            v-model="classesName"
            class="input w-full"
            placeholder="root name (e.g. nameservice.dys)"
          />
          <input
            v-model="classesPrefix"
            class="input w-full"
            placeholder="subclass_prefix (optional)"
          />
          <div class="flex gap-2">
            <button class="btn btn-primary" @click="fetchClassesInit">Init</button>
            <button class="btn" @click="fetchClassesLoadMore">Load More</button>
          </div>
          <div class="text-sm">
            count=<code>{{ classesCount }}</code>
          </div>
          <div v-if="classesError" class="text-sm text-red-600">
            {{ classesError }}
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="text-sm font-semibold opacity-70">Denoms by Name</h4>
          <input v-model="denomsName" class="input w-full" placeholder="root name" />
          <input
            v-model="denomsPrefix"
            class="input w-full"
            placeholder="subdenom_prefix (optional)"
          />
          <div class="flex gap-2">
            <button class="btn btn-primary" @click="fetchDenomsInit">Init</button>
            <button class="btn" @click="fetchDenomsLoadMore">Load More</button>
          </div>
          <div class="text-sm">
            count=<code>{{ denomsCount }}</code>
          </div>
          <div v-if="denomsError" class="text-sm text-red-600">
            {{ denomsError }}
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="text-sm font-semibold opacity-70">Params</h4>
          <button class="btn btn-primary" @click="fetchParams">Fetch</button>
          <div class="text-xs opacity-70 grid grid-cols-2 gap-x-2">
            <div>
              min_fee_pct=<code>{{ params.min_valuation_fee_pct }}</code>
            </div>
            <div>
              max_fee_pct=<code>{{ params.max_valuation_fee_pct }}</code>
            </div>
            <div>
              min_period=<code>{{ params.min_valuation_period }}</code>
            </div>
            <div>
              max_period=<code>{{ params.max_valuation_period }}</code>
            </div>
          </div>
          <div v-if="paramsError" class="text-sm text-red-600">
            {{ paramsError }}
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="text-sm font-semibold opacity-70">Name (NFT) by ID</h4>
          <input v-model="nameInput" class="input w-full" placeholder="name id" />
          <div class="flex gap-2">
            <button class="btn btn-primary" @click="fetchName">Fetch</button>
          </div>
          <div class="text-sm">
            owner=<code>{{ nameOwner }}</code>
          </div>
          <div v-if="nameError" class="text-sm text-red-600">
            {{ nameError }}
          </div>
        </div>
      </div>
    </div>

    <div class="space-y-4 p-4 border rounded">
      <h3 class="font-semibold">Actions</h3>
      <div class="space-y-2">
        <h4 class="text-sm font-semibold opacity-70">Advanced Actions</h4>
        <!-- moved advanced actions from queries to actions -->
        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Create External Name</div>
          <input v-model="extAuthority" class="input w-full" placeholder="authority" />
          <input v-model="extName" class="input w-full" placeholder="name (e.g. example.com)" />
          <button class="btn btn-primary" @click="createExternalName">Send</button>
          <div v-if="extError" class="text-sm text-red-600">{{ extError }}</div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Set NFT Metadata</div>
          <input v-model="nftMetaDest" class="input w-full" placeholder="name_destination" />
          <input v-model="nftMetaClass" class="input w-full" placeholder="class_id" />
          <input v-model="nftMetaId" class="input w-full" placeholder="nft_id" />
          <input v-model="nftMeta" class="input w-full" placeholder="metadata (optional)" />
          <input v-model="nftUri" class="input w-full" placeholder="uri (optional)" />
          <input v-model="nftUriHash" class="input w-full" placeholder="uri_hash (optional)" />
          <button class="btn btn-primary" @click="setNftMetadata">Send</button>
          <div v-if="nftMetaError" class="text-sm text-red-600">{{ nftMetaError }}</div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Set Class Extra Data</div>
          <input v-model="classDest" class="input w-full" placeholder="name_destination" />
          <input v-model="classId" class="input w-full" placeholder="class_id" />
          <input v-model="classExtra" class="input w-full" placeholder="extra_data" />
          <button class="btn btn-primary" @click="setClassExtra">Send</button>
          <div v-if="classExtraError" class="text-sm text-red-600">{{ classExtraError }}</div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Set Class Always Listed</div>
          <input v-model="classDest2" class="input w-full" placeholder="name_destination" />
          <input v-model="classId2" class="input w-full" placeholder="class_id" />
          <select v-model="classAlwaysListed" class="select select-bordered w-full">
            <option :value="true">true</option>
            <option :value="false">false</option>
          </select>
          <button class="btn btn-primary" @click="setClassAlwaysListed">Send</button>
          <div v-if="classAlwaysError" class="text-sm text-red-600">{{ classAlwaysError }}</div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Set Class Valuation Fee Pct</div>
          <input v-model="classDest3" class="input w-full" placeholder="name_destination" />
          <input v-model="classId3" class="input w-full" placeholder="class_id" />
          <input
            v-model="classValFeePct"
            class="input w-full"
            placeholder="valuation_fee_pct (Dec)"
          />
          <button class="btn btn-primary" @click="setClassValFeePct">Send</button>
          <div v-if="classValFeeError" class="text-sm text-red-600">{{ classValFeeError }}</div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Set Class Valuation Period</div>
          <input v-model="classDest4" class="input w-full" placeholder="name_destination" />
          <input v-model="classId4" class="input w-full" placeholder="class_id" />
          <input v-model="classValPeriodSec" class="input w-full" placeholder="seconds" />
          <button class="btn btn-primary" @click="setClassValPeriod">Send</button>
          <div v-if="classValPeriodError" class="text-sm text-red-600">
            {{ classValPeriodError }}
          </div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Set Class Bid Timeout</div>
          <input v-model="classDest5" class="input w-full" placeholder="name_destination" />
          <input v-model="classId5" class="input w-full" placeholder="class_id" />
          <input v-model="classBidTimeoutSec" class="input w-full" placeholder="seconds" />
          <button class="btn btn-primary" @click="setClassBidTimeout">Send</button>
          <div v-if="classBidTimeoutError" class="text-sm text-red-600">
            {{ classBidTimeoutError }}
          </div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Set Class Allowed Denoms</div>
          <input v-model="classDest6" class="input w-full" placeholder="name_destination" />
          <input v-model="classId6" class="input w-full" placeholder="class_id" />
          <input
            v-model="classAllowedDenoms"
            class="input w-full"
            placeholder="denoms (comma-separated)"
          />
          <button class="btn btn-primary" @click="setClassAllowedDenoms">Send</button>
          <div v-if="classAllowedDenomsError" class="text-sm text-red-600">
            {{ classAllowedDenomsError }}
          </div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Set Class Reject Fee Percent</div>
          <input v-model="classDest7" class="input w-full" placeholder="name_destination" />
          <input v-model="classId7" class="input w-full" placeholder="class_id" />
          <input
            v-model="classRejectFeePct"
            class="input w-full"
            placeholder="reject fee percent (Dec)"
          />
          <button class="btn btn-primary" @click="setClassRejectFeePct">Send</button>
          <div v-if="classRejectFeeError" class="text-sm text-red-600">
            {{ classRejectFeeError }}
          </div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Set Class Minimum Bid Increase</div>
          <input v-model="classDest8" class="input w-full" placeholder="name_destination" />
          <input v-model="classId8" class="input w-full" placeholder="class_id" />
          <input
            v-model="classMinBidIncPct"
            class="input w-full"
            placeholder="min bid increase percent (Dec)"
          />
          <button class="btn btn-primary" @click="setClassMinBidIncPct">Send</button>
          <div v-if="classMinBidIncError" class="text-sm text-red-600">
            {{ classMinBidIncError }}
          </div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Set Listed</div>
          <input v-model="listedOwner" class="input w-full" placeholder="nft_owner" />
          <input v-model="listedClassId" class="input w-full" placeholder="nft_class_id" />
          <input v-model="listedNftId" class="input w-full" placeholder="nft_id" />
          <select v-model="listedFlag" class="select select-bordered w-full">
            <option :value="true">true</option>
            <option :value="false">false</option>
          </select>
          <button class="btn btn-primary" @click="setListed">Send</button>
          <div v-if="listedError" class="text-sm text-red-600">{{ listedError }}</div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Update Params</div>
          <input v-model="updAuthority" class="input w-full" placeholder="authority" />
          <input
            v-model="updParamsJson"
            class="input w-full"
            placeholder='params JSON (e.g. {"min_valuation_fee_pct":"0.01"})'
          />
          <button class="btn btn-primary" @click="updateParams">Send</button>
          <div v-if="updError" class="text-sm text-red-600">{{ updError }}</div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Burn Coins</div>
          <input v-model="burnDest" class="input w-full" placeholder="name_destination" />
          <input
            v-model="burnAmountJson"
            class="input w-full"
            placeholder='amount JSON array (e.g. [{"denom":"udys","amount":"10"}])'
          />
          <button class="btn btn-primary" @click="burnCoins">Send</button>
          <div v-if="burnError" class="text-sm text-red-600">{{ burnError }}</div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Set Denom Metadata</div>
          <input v-model="denomMetaAuthority" class="input w-full" placeholder="authority" />
          <input v-model="denomMetadataJson" class="input w-full" placeholder="metadata JSON" />
          <button class="btn btn-primary" @click="setDenomMetadata">Send</button>
          <div v-if="denomMetaError" class="text-sm text-red-600">{{ denomMetaError }}</div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Set Denom Description</div>
          <input v-model="denDescDest" class="input w-full" placeholder="name_destination" />
          <input v-model="denDescDenom" class="input w-full" placeholder="denom" />
          <input v-model="denDescText" class="input w-full" placeholder="description" />
          <button class="btn btn-primary" @click="setDenomDescription">Send</button>
          <div v-if="denDescError" class="text-sm text-red-600">{{ denDescError }}</div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Set Denom URI</div>
          <input v-model="denUriDest" class="input w-full" placeholder="name_destination" />
          <input v-model="denUriDenom" class="input w-full" placeholder="denom" />
          <input v-model="denUri" class="input w-full" placeholder="uri (optional)" />
          <input v-model="denUriHash" class="input w-full" placeholder="uri_hash (optional)" />
          <button class="btn btn-primary" @click="setDenomURI">Send</button>
          <div v-if="denUriError" class="text-sm text-red-600">{{ denUriError }}</div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Delete Class</div>
          <input v-model="delClassDest" class="input w-full" placeholder="name_destination" />
          <input v-model="delClassId" class="input w-full" placeholder="class_id" />
          <button class="btn btn-primary" @click="deleteClass">Send</button>
          <div v-if="delClassError" class="text-sm text-red-600">{{ delClassError }}</div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Mint NFT</div>
          <input v-model="mintDest" class="input w-full" placeholder="name_destination" />
          <input v-model="mintClassId" class="input w-full" placeholder="class_id" />
          <input v-model="mintNftId" class="input w-full" placeholder="nft_id" />
          <input v-model="mintUri" class="input w-full" placeholder="uri (optional)" />
          <input v-model="mintUriHash" class="input w-full" placeholder="uri_hash (optional)" />
          <button class="btn btn-primary" @click="mintNft">Send</button>
          <div v-if="mintError" class="text-sm text-red-600">{{ mintError }}</div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Burn NFT</div>
          <input v-model="burnNftDest" class="input w-full" placeholder="name_destination" />
          <input v-model="burnNftClassId" class="input w-full" placeholder="class_id" />
          <input v-model="burnNftId" class="input w-full" placeholder="nft_id" />
          <button class="btn btn-primary" @click="burnNft">Send</button>
          <div v-if="burnNftError" class="text-sm text-red-600">{{ burnNftError }}</div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Move Coins</div>
          <input v-model="moveCoinsDest" class="input w-full" placeholder="name_destination" />
          <input v-model="moveCoinsInputsJson" class="input w-full" placeholder="inputs JSON" />
          <input v-model="moveCoinsOutputsJson" class="input w-full" placeholder="outputs JSON" />
          <button class="btn btn-primary" @click="moveCoins">Send</button>
          <div v-if="moveCoinsError" class="text-sm text-red-600">{{ moveCoinsError }}</div>
        </div>

        <div class="space-y-2 p-2 border rounded">
          <div class="font-semibold text-xs">Move NFT</div>
          <input v-model="moveNftDest" class="input w-full" placeholder="name_destination" />
          <input v-model="moveNftClassId" class="input w-full" placeholder="class_id" />
          <input v-model="moveNftId" class="input w-full" placeholder="nft_id" />
          <input v-model="moveNftTo" class="input w-full" placeholder="to_address" />
          <button class="btn btn-primary" @click="moveNft">Send</button>
          <div v-if="moveNftError" class="text-sm text-red-600">{{ moveNftError }}</div>
        </div>
      </div>
      <div class="space-y-2">
        <h4 class="text-sm font-semibold opacity-70">Set Destination</h4>
        <input v-model="actOwner" class="input w-full" placeholder="owner" />
        <input v-model="actName" class="input w-full" placeholder="name" />
        <input v-model="actDestination" class="input w-full" placeholder="destination address" />
        <input v-model="actMemo" class="input w-full" placeholder="memo (optional)" />
        <button class="btn btn-primary" @click="setDestination">Send</button>
        <div v-if="actError" class="text-sm text-red-600">
          {{ actError }}
        </div>
      </div>

      <div class="space-y-2">
        <h4 class="text-sm font-semibold opacity-70">Set Name Metadata</h4>
        <input v-model="metaOwner" class="input w-full" placeholder="owner" />
        <input v-model="metaName" class="input w-full" placeholder="name" />
        <input v-model="metaValue" class="input w-full" placeholder="metadata" />
        <button class="btn btn-primary" @click="setNameMetadata">Send</button>
        <div v-if="metaError" class="text-sm text-red-600">
          {{ metaError }}
        </div>
      </div>

      <div class="space-y-2">
        <h4 class="text-sm font-semibold opacity-70">Set Valuation</h4>
        <input v-model="valOwner" class="input w-full" placeholder="owner" />
        <input v-model="valClassId" class="input w-full" placeholder="nft_class_id" />
        <input v-model="valName" class="input w-full" placeholder="nft_id" />
        <div class="flex gap-2">
          <input v-model="valAmount" class="input w-full" placeholder="amount" />
          <input v-model="valDenom" class="input w-full" placeholder="denom" />
        </div>
        <input
          v-model="valMaxFeePct"
          class="input w-full"
          placeholder="max_valuation_fee_pct (optional)"
        />
        <button class="btn btn-primary" @click="setValuation">Send</button>
        <div v-if="valError" class="text-sm text-red-600">
          {{ valError }}
        </div>
      </div>

      <div class="space-y-2">
        <h4 class="text-sm font-semibold opacity-70">Renew</h4>
        <input v-model="renewPayer" class="input w-full" placeholder="payer" />
        <input v-model="renewClassId" class="input w-full" placeholder="nft_class_id" />
        <input v-model="renewName" class="input w-full" placeholder="nft_id" />
        <button class="btn btn-primary" @click="renew">Send</button>
        <div v-if="renewError" class="text-sm text-red-600">
          {{ renewError }}
        </div>
      </div>

      <div class="space-y-2">
        <h4 class="text-sm font-semibold opacity-70">Bids</h4>
        <div class="space-y-2">
          <input v-model="bidBidder" class="input w-full" placeholder="bidder" />
          <input v-model="bidClassId" class="input w-full" placeholder="nft_class_id" />
          <input v-model="bidName" class="input w-full" placeholder="nft_id" />
          <div class="flex gap-2">
            <input v-model="bidAmount" class="input w-full" placeholder="amount" />
            <input v-model="bidDenom" class="input w-full" placeholder="denom" />
          </div>
          <button class="btn btn-primary" @click="placeBid">Place</button>
          <div v-if="bidError" class="text-sm text-red-600">
            {{ bidError }}
          </div>
        </div>
        <div class="space-y-2">
          <input v-model="accOwner" class="input w-full" placeholder="owner" />
          <input v-model="accClassId" class="input w-full" placeholder="nft_class_id" />
          <input v-model="accName" class="input w-full" placeholder="nft_id" />
          <button class="btn btn-primary" @click="acceptBid">Accept</button>
          <div v-if="accError" class="text-sm text-red-600">{{ accError }}</div>
        </div>
        <div class="space-y-2">
          <input v-model="rejOwner" class="input w-full" placeholder="owner" />
          <input v-model="rejClassId" class="input w-full" placeholder="nft_class_id" />
          <input v-model="rejName" class="input w-full" placeholder="nft_id" />
          <div class="flex gap-2">
            <input v-model="rejAmount" class="input w-full" placeholder="new valuation amount" />
            <input v-model="rejDenom" class="input w-full" placeholder="denom" />
          </div>
          <button class="btn btn-primary" @click="rejectBid">Reject</button>
          <div v-if="rejError" class="text-sm text-red-600">
            {{ rejError }}
          </div>
        </div>
        <div class="space-y-2">
          <input v-model="claimBidder" class="input w-full" placeholder="bidder" />
          <input v-model="claimClassId" class="input w-full" placeholder="nft_class_id" />
          <input v-model="claimName" class="input w-full" placeholder="nft_id" />
          <button class="btn btn-primary" @click="claimBid">Claim</button>
          <div v-if="claimError" class="text-sm text-red-600">
            {{ claimError }}
          </div>
        </div>
      </div>

      <div class="space-y-2">
        <h4 class="text-sm font-semibold opacity-70">Registration Commit</h4>
        <input v-model="regCommitter" class="input w-full" placeholder="committer" />
        <div class="text-xs opacity-70">
          hexhash: <span class="font-mono">{{ regHexhash }}</span>
        </div>
        <div class="flex gap-2">
          <input v-model="regAmount" class="input w-full" placeholder="valuation amount" />
          <input v-model="regDenom" class="input w-full" placeholder="denom" />
        </div>
        <button class="btn btn-primary" @click="commit">Commit</button>
        <div v-if="regError" class="text-sm text-red-600">
          {{ regError }}
        </div>
      </div>

      <div class="space-y-2">
        <h4 class="text-sm font-semibold opacity-70">Registration Reveal</h4>
        <input v-model="regCommitter" class="input w-full" placeholder="committer" />
        <input v-model="regName" class="input w-full" placeholder="name" />
        <input v-model="regSalt" class="input w-full" placeholder="salt" />
        <button class="btn btn-primary" @click="reveal">Reveal</button>
        <div v-if="regError" class="text-sm text-red-600">
          {{ regError }}
        </div>
      </div>
    </div>

    <div class="space-y-2 p-4 border rounded">
      <h3 class="font-semibold">In-memory</h3>
      <h4 class="text-sm font-semibold opacity-70">Names (by class)</h4>
      <div class="text-sm opacity-70">
        count: <code>{{ namesInMemory.length }}</code>
      </div>
      <div class="overflow-x-auto">
        <table class="table table-xs w-full">
          <thead>
            <tr>
              <th>name</th>
              <th>owner</th>
              <th>uri</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="n in namesInMemory" :key="n.name">
              <td class="font-mono">
                {{ n.name }}
              </td>
              <td>
                <code>{{ n.owner }}</code>
              </td>
              <td class="max-w-[24rem] truncate">
                <code>{{ n.uri }}</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="h-px" />
      <h4 class="text-sm font-semibold opacity-70">Names by Destination</h4>
      <div class="text-sm opacity-70">
        count: <code>{{ namesByDestCount }}</code>
      </div>
      <div class="overflow-x-auto">
        <table class="table table-xs w-full">
          <thead>
            <tr>
              <th>destination</th>
              <th>name</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in namesByDestList" :key="r.destination + ':' + r.name">
              <td class="font-mono">
                {{ r.destination }}
              </td>
              <td>
                <code>{{ r.name }}</code>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="h-px" />

      <div class="h-px" />
      <h4 class="text-sm font-semibold opacity-70">Params snapshot</h4>
      <div class="text-xs opacity-70 grid grid-cols-2 gap-x-2">
        <div>
          min_fee_pct=<code>{{ params.min_valuation_fee_pct }}</code>
        </div>
        <div>
          max_fee_pct=<code>{{ params.max_valuation_fee_pct }}</code>
        </div>
        <div>
          min_period=<code>{{ params.min_valuation_period }}</code>
        </div>
        <div>
          max_period=<code>{{ params.max_valuation_period }}</code>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRepo } from 'pinia-orm'
import { useAxiosRepo } from '@pinia-orm/axios'
import { useWallet } from '@/composables/useWallet'
import NameserviceParams from '@/orm/models/nameservice/NameserviceParams'
import NameResolution from '@/orm/models/nameservice/NameResolution'
import ClassesByName from '@/orm/models/nameservice/ClassesByName'
import DenomsByName from '@/orm/models/nameservice/DenomsByName'
import NftItem from '@/orm/models/nft/NftItem'
import NamesByDestination from '@/orm/models/nameservice/NamesByDestination'
import NameserviceRegistration from '../../orm/models/nameservice/Registration'
import NameserviceActions from '../../orm/models/nameservice/Actions'

const wallet = useWallet()

const paramsRepo = useRepo(NameserviceParams)
const resRepo = useRepo(NameResolution)
const classesRepo = useRepo(ClassesByName)
const denomsRepo = useRepo(DenomsByName)
const nameRepo = useRepo(NftItem)
const namesByDestRepo = useRepo(NamesByDestination)

// Resolve
const resolveInput = ref('')
const resolveError = ref('')
const resolvedAddress = computed(() => (resRepo.find(resolveInput.value) as any)?.address || '')
async function resolveName() {
  resolveError.value = ''
  try {
    const input = resolveInput.value.trim()
    if (!input) throw new Error('input required')
    await useAxiosRepo(NameResolution).api().resolve(input)
  } catch (e: any) {
    console.error(e)
    resolveError.value = e?.message || String(e)
  }
}

// Names by destination
const destInput = ref('')
const namesError = ref('')
const namesByDestList = computed(() => {
  const dest = destInput.value.trim()
  if (!dest) return [] as Array<{ destination: string; name: string }>
  const coll = namesByDestRepo
    .query()
    .where('destination', (v: string) => v === dest)
    .get()
  return (coll as any[]).map((r: any) => ({ destination: r.destination, name: r.name }))
})
async function resolveAllNamesForDestination() {
  namesError.value = ''
  try {
    const dest = destInput.value.trim()
    if (!dest) throw new Error('destination required')
    await useAxiosRepo(NamesByDestination).api().fetchInit({ destination: dest })
  } catch (e: any) {
    console.error(e)
    namesError.value = e?.message || String(e)
  }
}

// Names by owner (dynamic class id)
const namesOwner = ref('')
const namesByOwnerError = ref('')
const namesOwnerClassId = ref('nameservice.dys')
const namesForOwnerCount = computed(
  () =>
    nameRepo
      .all()
      .filter(
        (n: any) =>
          n.class_id === namesOwnerClassId.value && n.owner === (namesOwner.value || '').trim()
      ).length
)
async function fetchNamesByOwner() {
  namesByOwnerError.value = ''
  try {
    const owner = namesOwner.value.trim()
    if (!owner) throw new Error('owner required')
    await useAxiosRepo(NftItem).api().fetchNfts({ class_id: namesOwnerClassId.value, owner })
  } catch (e: any) {
    console.error(e)
    namesByOwnerError.value = e?.message || String(e)
  }
}

// Classes by name
const classesName = ref('')
const classesPrefix = ref('')
const classesError = ref('')
let classesNextKey: string | undefined
let classesPage = 1
const classesCount = computed(() => classesRepo.all().length)
// removed unused classesByNameList
async function fetchClassesInit() {
  classesError.value = ''
  try {
    const name = classesName.value.trim()
    if (!name) throw new Error('name required')
    const subclass_prefix = classesPrefix.value.trim() || undefined
    const res = await useAxiosRepo(ClassesByName).api().fetchInit({ name, subclass_prefix })
    classesNextKey = res.next_key
    classesPage = 2
  } catch (e: any) {
    console.error(e)
    classesError.value = e?.message || String(e)
  }
}
async function fetchClassesLoadMore() {
  classesError.value = ''
  try {
    const name = classesName.value.trim()
    if (!name) throw new Error('name required')
    const subclass_prefix = classesPrefix.value.trim() || undefined
    const res = await useAxiosRepo(ClassesByName)
      .api()
      .fetchLoadMore({ name, subclass_prefix, next_key: classesNextKey, page: classesPage })
    classesNextKey = res.next_key
    if (!classesNextKey) classesPage += 1
  } catch (e: any) {
    console.error(e)
    classesError.value = e?.message || String(e)
  }
}

// Denoms by name
const denomsName = ref('')
const denomsPrefix = ref('')
const denomsError = ref('')
let denomsNextKey: string | undefined
let denomsPage = 1
const denomsCount = computed(() => denomsRepo.all().length)
// removed unused denomsByNameList
async function fetchDenomsInit() {
  denomsError.value = ''
  try {
    const name = denomsName.value.trim()
    if (!name) throw new Error('name required')
    const subdenom_prefix = denomsPrefix.value.trim() || undefined
    const res = await useAxiosRepo(DenomsByName).api().fetchInit({ name, subdenom_prefix })
    denomsNextKey = res.next_key
    denomsPage = 2
  } catch (e: any) {
    console.error(e)
    denomsError.value = e?.message || String(e)
  }
}
async function fetchDenomsLoadMore() {
  denomsError.value = ''
  try {
    const name = denomsName.value.trim()
    if (!name) throw new Error('name required')
    const subdenom_prefix = denomsPrefix.value.trim() || undefined
    const res = await useAxiosRepo(DenomsByName)
      .api()
      .fetchLoadMore({ name, subdenom_prefix, next_key: denomsNextKey, page: denomsPage })
    denomsNextKey = res.next_key
    if (!denomsNextKey) denomsPage += 1
  } catch (e: any) {
    console.error(e)
    denomsError.value = e?.message || String(e)
  }
}

// Params
const paramsError = ref('')
const params = computed(
  () =>
    (paramsRepo.find('default') as any) || {
      min_valuation_fee_pct: '',
      max_valuation_fee_pct: '',
      min_valuation_period: '',
      max_valuation_period: '',
    }
)
async function fetchParams() {
  paramsError.value = ''
  try {
    await useAxiosRepo(NameserviceParams).api().fetch()
  } catch (e: any) {
    console.error(e)
    paramsError.value = e?.message || String(e)
  }
}

// Name (NFT)
const nameInput = ref('')
const nameError = ref('')
const nameClassId = ref('nameservice.dys')
const nameOwner = computed(
  () => (nameRepo.find([nameClassId.value, nameInput.value]) as any)?.owner || ''
)
async function fetchName() {
  nameError.value = ''
  try {
    const name = nameInput.value.trim()
    if (!name) throw new Error('name required')
    await useAxiosRepo(NftItem).api().fetchNft(nameClassId.value, name)
    await useAxiosRepo(NftItem).api().fetchOwner(nameClassId.value, name)
  } catch (e: any) {
    console.error(e)
    nameError.value = e?.message || String(e)
  }
}

// Actions
const actOwner = ref('')
const actName = ref('')
const actDestination = ref('')
const actMemo = ref('')
const actError = ref('')
async function setDestination() {
  actError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .setDestination({
        owner: actOwner.value,
        name: actName.value,
        destination: actDestination.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
        ...(actMemo.value ? { memo: actMemo.value } : {}),
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Set destination failed')
    await Promise.allSettled([
      useAxiosRepo(NftItem).api().fetchNft(nameClassId.value, actName.value),
      useAxiosRepo(NftItem).api().fetchOwner(nameClassId.value, actName.value),
    ])
  } catch (e: any) {
    console.error(e)
    actError.value = e?.message || String(e)
  }
}

const metaOwner = ref('')
const metaName = ref('')
const metaValue = ref('')
const metaError = ref('')
async function setNameMetadata() {
  metaError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .setNameMetadata({
        owner: metaOwner.value,
        name: metaName.value,
        metadata: metaValue.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Set name metadata failed')
    await Promise.allSettled([
      useAxiosRepo(NftItem).api().fetchNft(nameClassId.value, metaName.value),
      useAxiosRepo(NftItem).api().fetchOwner(nameClassId.value, metaName.value),
    ])
  } catch (e: any) {
    console.error(e)
    metaError.value = e?.message || String(e)
  }
}

const valOwner = ref('')
const valClassId = ref('')
const valName = ref('')
const valAmount = ref('')
const valDenom = ref('')
const valMaxFeePct = ref('')
const valError = ref('')
async function setValuation() {
  valError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .setValuation({
        owner: valOwner.value,
        nft_class_id: valClassId.value,
        nft_id: valName.value,
        valuation: { amount: valAmount.value, denom: valDenom.value },
        max_valuation_fee_pct: valMaxFeePct.value || undefined,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Set valuation failed')
    await useAxiosRepo(NftItem).api().fetchNft(valClassId.value, valName.value)
  } catch (e: any) {
    console.error(e)
    valError.value = e?.message || String(e)
  }
}

const renewPayer = ref('')
const renewClassId = ref('')
const renewName = ref('')
const renewError = ref('')
async function renew() {
  renewError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .renew({
        payer: renewPayer.value,
        nft_class_id: renewClassId.value,
        nft_id: renewName.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Renew failed')
    await useAxiosRepo(NftItem).api().fetchNft(renewClassId.value, renewName.value)
  } catch (e: any) {
    console.error(e)
    renewError.value = e?.message || String(e)
  }
}

const bidBidder = ref('')
const bidClassId = ref('')
const bidName = ref('')
const bidAmount = ref('')
const bidDenom = ref('')
const bidError = ref('')
async function placeBid() {
  bidError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .placeBid({
        bidder: bidBidder.value,
        nft_class_id: bidClassId.value,
        nft_id: bidName.value,
        bid_amount: { amount: bidAmount.value, denom: bidDenom.value },
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Place bid failed')
    await useAxiosRepo(NftItem).api().fetchNft(bidClassId.value, bidName.value)
  } catch (e: any) {
    console.error(e)
    bidError.value = e?.message || String(e)
  }
}

const accOwner = ref('')
const accClassId = ref('')
const accName = ref('')
const accError = ref('')
async function acceptBid() {
  accError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .acceptBid({
        owner: accOwner.value,
        nft_class_id: accClassId.value,
        nft_id: accName.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Accept bid failed')
    await useAxiosRepo(NftItem).api().fetchNft(accClassId.value, accName.value)
  } catch (e: any) {
    console.error(e)
    accError.value = e?.message || String(e)
  }
}

const rejOwner = ref('')
const rejClassId = ref('')
const rejName = ref('')
const rejAmount = ref('')
const rejDenom = ref('')
const rejError = ref('')
async function rejectBid() {
  rejError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .rejectBid({
        owner: rejOwner.value,
        nft_class_id: rejClassId.value,
        nft_id: rejName.value,
        new_valuation: { amount: rejAmount.value, denom: rejDenom.value },
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Reject bid failed')
    await useAxiosRepo(NftItem).api().fetchNft(rejClassId.value, rejName.value)
  } catch (e: any) {
    console.error(e)
    rejError.value = e?.message || String(e)
  }
}

const claimBidder = ref('')
const claimClassId = ref('')
const claimName = ref('')
const claimError = ref('')
async function claimBid() {
  claimError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .claimBid({
        bidder: claimBidder.value,
        nft_class_id: claimClassId.value,
        nft_id: claimName.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Claim bid failed')
    await useAxiosRepo(NftItem).api().fetchNft(claimClassId.value, claimName.value)
  } catch (e: any) {
    console.error(e)
    claimError.value = e?.message || String(e)
  }
}

// Advanced actions state + handlers
const extAuthority = ref('')
const extName = ref('')
const extError = ref('')
async function createExternalName() {
  extError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .createExternalName({
        authority: extAuthority.value,
        name: extName.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Create external name failed')
  } catch (e: any) {
    console.error(e)
    extError.value = e?.message || String(e)
  }
}

const nftMetaDest = ref('')
const nftMetaClass = ref('')
const nftMetaId = ref('')
const nftMeta = ref('')
const nftUri = ref('')
const nftUriHash = ref('')
const nftMetaError = ref('')
async function setNftMetadata() {
  nftMetaError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .setNFTMetadata({
        name_destination: nftMetaDest.value,
        class_id: nftMetaClass.value,
        nft_id: nftMetaId.value,
        metadata: nftMeta.value || undefined,
        uri: nftUri.value || undefined,
        uri_hash: nftUriHash.value || undefined,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Set NFT metadata failed')
  } catch (e: any) {
    console.error(e)
    nftMetaError.value = e?.message || String(e)
  }
}

const classDest = ref('')
const classId = ref('')
const classExtra = ref('')
const classExtraError = ref('')
async function setClassExtra() {
  classExtraError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .setNFTClassExtraData({
        name_destination: classDest.value,
        class_id: classId.value,
        extra_data: classExtra.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Set class extra_data failed')
  } catch (e: any) {
    console.error(e)
    classExtraError.value = e?.message || String(e)
  }
}

const classDest2 = ref('')
const classId2 = ref('')
const classAlwaysListed = ref(true)
const classAlwaysError = ref('')
async function setClassAlwaysListed() {
  classAlwaysError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .setNFTClassAlwaysListed({
        name_destination: classDest2.value,
        class_id: classId2.value,
        always_listed: Boolean(classAlwaysListed.value),
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Set class always_listed failed')
  } catch (e: any) {
    console.error(e)
    classAlwaysError.value = e?.message || String(e)
  }
}

const classDest3 = ref('')
const classId3 = ref('')
const classValFeePct = ref('')
const classValFeeError = ref('')
async function setClassValFeePct() {
  classValFeeError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .setNFTClassValuationFeePct({
        name_destination: classDest3.value,
        class_id: classId3.value,
        valuation_fee_pct: classValFeePct.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Set class valuation_fee_pct failed')
  } catch (e: any) {
    console.error(e)
    classValFeeError.value = e?.message || String(e)
  }
}

const classDest4 = ref('')
const classId4 = ref('')
const classValPeriodSec = ref('')
const classValPeriodError = ref('')
async function setClassValPeriod() {
  classValPeriodError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .setNFTClassValuationPeriod({
        name_destination: classDest4.value,
        class_id: classId4.value,
        valuation_period: { seconds: String(classValPeriodSec.value || '0') },
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Set class valuation_period failed')
  } catch (e: any) {
    console.error(e)
    classValPeriodError.value = e?.message || String(e)
  }
}

const classDest5 = ref('')
const classId5 = ref('')
const classBidTimeoutSec = ref('')
const classBidTimeoutError = ref('')
async function setClassBidTimeout() {
  classBidTimeoutError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .setNFTClassBidTimeout({
        name_destination: classDest5.value,
        class_id: classId5.value,
        bid_timeout: { seconds: String(classBidTimeoutSec.value || '0') },
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Set class bid_timeout failed')
  } catch (e: any) {
    console.error(e)
    classBidTimeoutError.value = e?.message || String(e)
  }
}

const classDest6 = ref('')
const classId6 = ref('')
const classAllowedDenoms = ref('')
const classAllowedDenomsError = ref('')
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
        name_destination: classDest6.value,
        class_id: classId6.value,
        allowed_denoms: list,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Set class allowed_denoms failed')
  } catch (e: any) {
    console.error(e)
    classAllowedDenomsError.value = e?.message || String(e)
  }
}

const classDest7 = ref('')
const classId7 = ref('')
const classRejectFeePct = ref('')
const classRejectFeeError = ref('')
async function setClassRejectFeePct() {
  classRejectFeeError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .setNFTClassRejectBidValuationFeePercent({
        name_destination: classDest7.value,
        class_id: classId7.value,
        reject_bid_valuation_fee_percent: classRejectFeePct.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Set class reject fee percent failed')
  } catch (e: any) {
    console.error(e)
    classRejectFeeError.value = e?.message || String(e)
  }
}

const classDest8 = ref('')
const classId8 = ref('')
const classMinBidIncPct = ref('')
const classMinBidIncError = ref('')
async function setClassMinBidIncPct() {
  classMinBidIncError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .setNFTClassMinimumBidPercentIncrease({
        name_destination: classDest8.value,
        class_id: classId8.value,
        minimum_bid_percent_increase: classMinBidIncPct.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Set class min bid increase failed')
  } catch (e: any) {
    console.error(e)
    classMinBidIncError.value = e?.message || String(e)
  }
}

// Set Listed
const listedOwner = ref('')
const listedClassId = ref('')
const listedNftId = ref('')
const listedFlag = ref(true)
const listedError = ref('')
async function setListed() {
  listedError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .setListed({
        nft_owner: listedOwner.value,
        nft_class_id: listedClassId.value,
        nft_id: listedNftId.value,
        listed: Boolean(listedFlag.value),
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Set listed failed')
  } catch (e: any) {
    console.error(e)
    listedError.value = e?.message || String(e)
  }
}

// Update Params
const updAuthority = ref('')
const updParamsJson = ref('')
const updError = ref('')
async function updateParams() {
  updError.value = ''
  try {
    const paramsObj = updParamsJson.value ? JSON.parse(updParamsJson.value) : {}
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .updateParams({
        authority: updAuthority.value,
        params: paramsObj,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Update params failed')
  } catch (e: any) {
    console.error(e)
    updError.value = e?.message || String(e)
  }
}

// Burn Coins
const burnDest = ref('')
const burnAmountJson = ref('')
const burnError = ref('')
async function burnCoins() {
  burnError.value = ''
  try {
    const amount = burnAmountJson.value ? JSON.parse(burnAmountJson.value) : []
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .burnCoins({
        name_destination: burnDest.value,
        amount,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Burn coins failed')
  } catch (e: any) {
    console.error(e)
    burnError.value = e?.message || String(e)
  }
}

// Set Denom Metadata
const denomMetaAuthority = ref('')
const denomMetadataJson = ref('')
const denomMetaError = ref('')
async function setDenomMetadata() {
  denomMetaError.value = ''
  try {
    const metadata = denomMetadataJson.value ? JSON.parse(denomMetadataJson.value) : {}
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .setDenomMetadata({
        authority: denomMetaAuthority.value,
        metadata,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Set denom metadata failed')
  } catch (e: any) {
    console.error(e)
    denomMetaError.value = e?.message || String(e)
  }
}

// Set Denom Description
const denDescDest = ref('')
const denDescDenom = ref('')
const denDescText = ref('')
const denDescError = ref('')
async function setDenomDescription() {
  denDescError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .setDenomDescription({
        name_destination: denDescDest.value,
        denom: denDescDenom.value,
        description: denDescText.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Set denom description failed')
  } catch (e: any) {
    console.error(e)
    denDescError.value = e?.message || String(e)
  }
}

// Set Denom URI
const denUriDest = ref('')
const denUriDenom = ref('')
const denUri = ref('')
const denUriHash = ref('')
const denUriError = ref('')
async function setDenomURI() {
  denUriError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .setDenomURI({
        name_destination: denUriDest.value,
        denom: denUriDenom.value,
        uri: denUri.value || undefined,
        uri_hash: denUriHash.value || undefined,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Set denom URI failed')
  } catch (e: any) {
    console.error(e)
    denUriError.value = e?.message || String(e)
  }
}

// Delete Class
const delClassDest = ref('')
const delClassId = ref('')
const delClassError = ref('')
async function deleteClass() {
  delClassError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .deleteClass({
        name_destination: delClassDest.value,
        class_id: delClassId.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Delete class failed')
  } catch (e: any) {
    console.error(e)
    delClassError.value = e?.message || String(e)
  }
}

// Mint NFT
const mintDest = ref('')
const mintClassId = ref('')
const mintNftId = ref('')
const mintUri = ref('')
const mintUriHash = ref('')
const mintError = ref('')
async function mintNft() {
  mintError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .mintNft({
        name_destination: mintDest.value,
        class_id: mintClassId.value,
        nft_id: mintNftId.value,
        uri: mintUri.value || undefined,
        uri_hash: mintUriHash.value || undefined,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Mint NFT failed')
  } catch (e: any) {
    console.error(e)
    mintError.value = e?.message || String(e)
  }
}

// Burn NFT
const burnNftDest = ref('')
const burnNftClassId = ref('')
const burnNftId = ref('')
const burnNftError = ref('')
async function burnNft() {
  burnNftError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .burnNft({
        name_destination: burnNftDest.value,
        class_id: burnNftClassId.value,
        nft_id: burnNftId.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Burn NFT failed')
  } catch (e: any) {
    console.error(e)
    burnNftError.value = e?.message || String(e)
  }
}

// Move Coins
const moveCoinsDest = ref('')
const moveCoinsInputsJson = ref('')
const moveCoinsOutputsJson = ref('')
const moveCoinsError = ref('')
async function moveCoins() {
  moveCoinsError.value = ''
  try {
    const inputs = moveCoinsInputsJson.value ? JSON.parse(moveCoinsInputsJson.value) : []
    const outputs = moveCoinsOutputsJson.value ? JSON.parse(moveCoinsOutputsJson.value) : []
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .moveCoins({
        name_destination: moveCoinsDest.value,
        inputs,
        outputs,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Move coins failed')
  } catch (e: any) {
    console.error(e)
    moveCoinsError.value = e?.message || String(e)
  }
}

// Move NFT
const moveNftDest = ref('')
const moveNftClassId = ref('')
const moveNftId = ref('')
const moveNftTo = ref('')
const moveNftError = ref('')
async function moveNft() {
  moveNftError.value = ''
  try {
    const res = await useAxiosRepo(NameserviceActions)
      .api()
      .moveNft({
        name_destination: moveNftDest.value,
        class_id: moveNftClassId.value,
        nft_id: moveNftId.value,
        to_address: moveNftTo.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
    if (!res?.success) throw new Error(res?.rawLog || 'Move NFT failed')
  } catch (e: any) {
    console.error(e)
    moveNftError.value = e?.message || String(e)
  }
}
// Registration
const regCommitter = ref('')
const regName = ref('')
const regSalt = ref('')
const regHexhash = ref('')
const regAmount = ref('')
const regDenom = ref('')
const regError = ref('')
async function computeHash() {
  regError.value = ''
  try {
    regHexhash.value = await useAxiosRepo(NameserviceRegistration)
      .api()
      .computeHash({ name: regName.value, salt: regSalt.value, committer: regCommitter.value })
  } catch (e: any) {
    console.error(e)
    regError.value = e?.message || String(e)
  }
}
async function commit() {
  regError.value = ''
  try {
    await useAxiosRepo(NameserviceRegistration)
      .api()
      .commit({
        committer: regCommitter.value,
        hexhash: regHexhash.value,
        valuation: { amount: regAmount.value, denom: regDenom.value },
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
      })
  } catch (e: any) {
    console.error(e)
    regError.value = e?.message || String(e)
  }
}
async function reveal() {
  regError.value = ''
  try {
    await useAxiosRepo(NameserviceRegistration)
      .api()
      .reveal({
        committer: regCommitter.value,
        name: regName.value,
        salt: regSalt.value,
        wallet: { sendMsg: wallet.sendMsg },
        gasLimit: 'auto',
        refreshNft: true,
      })
  } catch (e: any) {
    console.error(e)
    regError.value = e?.message || String(e)
  }
}

// In-memory tables
const namesInMemoryClassId = ref('nameservice.dys')
const namesInMemory = computed(() =>
  (nameRepo.all().filter((n: any) => n.class_id === namesInMemoryClassId.value) as any[]).map(
    (n: any) => ({
      name: n.id,
      owner: n.owner,
      uri: n.uri,
    })
  )
)
const namesByDestCount = computed(() => namesByDestList.value.length)
// removed unused counts
</script>
