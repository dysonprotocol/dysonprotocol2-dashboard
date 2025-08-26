{"url":"GET /cosmos/auth/v1beta1/accounts/{address}","returns":{"type":"QueryAccountResponse","fields":{"account":"Any<AccountI>"}}}
{"url":"GET /cosmos/auth/v1beta1/account_info/{address}","returns":{"type":"QueryAccountInfoResponse","fields":{"info":"BaseAccount"}}}
{"url":"GET /cosmos/bank/v1beta1/balances/{address}","returns":{"type":"QueryAllBalancesResponse","fields":{"balances":"Coin[]","pagination":"PageResponse"}}}
{"url":"GET /cosmos/bank/v1beta1/balances/{address}/by_denom?denom={denom}","returns":{"type":"QueryBalanceResponse","fields":{"balance":"Coin"}}}
{"url":"GET /cosmos/bank/v1beta1/spendable_balances/{address}","returns":{"type":"QuerySpendableBalancesResponse","fields":{"balances":"Coin[]","pagination":"PageResponse"}}}
{"url":"GET /cosmos/bank/v1beta1/spendable_balances/{address}/by_denom?denom={denom}","returns":{"type":"QuerySpendableBalanceByDenomResponse","fields":{"balance":"Coin"}}}
{"url":"GET /cosmos/staking/v1beta1/delegations/{delegator_addr}","returns":{"type":"QueryDelegatorDelegationsResponse","fields":{"delegation_responses":"DelegationResponse[]","pagination":"PageResponse"}}}
{"url":"GET /cosmos/staking/v1beta1/delegators/{delegator_addr}/unbonding_delegations","returns":{"type":"QueryDelegatorUnbondingDelegationsResponse","fields":{"unbonding_responses":"UnbondingDelegation[]","pagination":"PageResponse"}}}
{"url":"GET /cosmos/staking/v1beta1/delegators/{delegator_addr}/validators","returns":{"type":"QueryDelegatorValidatorsResponse","fields":{"validators":"Validator[]","pagination":"PageResponse"}}}
{"url":"GET /cosmos/staking/v1beta1/delegators/{delegator_addr}/redelegations","returns":{"type":"QueryRedelegationsResponse","fields":{"redelegation_responses":"RedelegationResponse[]","pagination":"PageResponse"}}}
{"url":"GET /cosmos/staking/v1beta1/validators/{validator_addr}","returns":{"type":"QueryValidatorResponse","fields":{"validator":"Validator"}}}
{"url":"GET /cosmos/staking/v1beta1/validators/{validator_addr}/delegations","returns":{"type":"QueryValidatorDelegationsResponse","fields":{"delegation_responses":"DelegationResponse[]","pagination":"PageResponse"}}}
{"url":"GET /cosmos/staking/v1beta1/validators/{validator_addr}/unbonding_delegations","returns":{"type":"QueryValidatorUnbondingDelegationsResponse","fields":{"unbonding_responses":"UnbondingDelegation[]","pagination":"PageResponse"}}}
{"url":"GET /cosmos/authz/v1beta1/grants/granter/{granter}","returns":{"type":"QueryGranterGrantsResponse","fields":{"grants":"GrantAuthorization[]","pagination":"PageResponse"}}}
{"url":"GET /cosmos/authz/v1beta1/grants/grantee/{grantee}","returns":{"type":"QueryGranteeGrantsResponse","fields":{"grants":"GrantAuthorization[]","pagination":"PageResponse"}}}
{"url":"GET /cosmos/gov/v1/proposals?voter={address}","returns":{"type":"QueryProposalsResponse","fields":{"proposals":"Proposal[]","pagination":"PageResponse"}}}
{"url":"GET /cosmos/gov/v1/proposals?depositor={address}","returns":{"type":"QueryProposalsResponse","fields":{"proposals":"Proposal[]","pagination":"PageResponse"}}}
{"url":"GET /cosmos/gov/v1/proposals/{proposal_id}/votes/{voter}","returns":{"type":"QueryVoteResponse","fields":{"vote":"Vote"}}}
{"url":"GET /cosmos/gov/v1/proposals/{proposal_id}/deposits/{depositor}","returns":{"type":"QueryDepositResponse","fields":{"deposit":"Deposit"}}}
{"url":"GET /dysonprotocol/crontask/v1/tasks/creator/{creator}","returns":{"type":"QueryTasksResponse","fields":{"tasks":"Task[]","pagination":"PageResponse"}}}
{"url":"GET /dysonprotocol/script/v1/script_info/{address}","returns":{"type":"QueryScriptInfoResponse","fields":{"script":"Script"}}}
{"url":"GET /dysonprotocol/storage/v1/storage_list?owner={address}&index_prefix={prefix}&filter={filter}&extract={path}","returns":{"type":"QueryStorageListResponse","fields":{"entries":"Storage[]","pagination":"PageResponse"}}}
{"url":"GET /dysonprotocol/storage/v1/storage_get?owner={address}&index={index}&extract={path}","returns":{"type":"QueryStorageGetResponse","fields":{"entry":"Storage"}}}
{"url":"GET /dysonprotocol/storage/v1/metrics?owner={address}","returns":{"type":"QueryMetricsResponse","fields":{"owner":"string","total_bytes":"uint64","min_stake_amount":"string","current_stake_amount":"string"}}}
{"url":"GET /dysonprotocol/nameservice/v1/names_by_destination/{address}","returns":{"type":"QueryNamesByDestinationResponse","fields":{"names":"string[]","pagination":"PageResponse"}}}
{"url":"GET /dysonprotocol/nft/v1beta1/nfts?owner={address}","returns":{"type":"QueryNFTsResponse","fields":{"nfts":"NFT[]","pagination":"PageResponse"}}}
{"url":"GET /dysonprotocol/nft/v1beta1/balance?class_id={class_id}&owner={address}","returns":{"type":"QueryBalanceResponse","fields":{"amount":"uint64"}}}
{"url":"GET /dysonprotocol/nft/v1beta1/class?class_id={class_id}","returns":{"type":"QueryClassResponse","fields":{"class":"Class"}}}

### Common edge cases and pitfalls (Pinia ORM + Axios on Cosmos REST)

- **Composite primary keys**: Many entities are keyed by multiple fields (e.g., `['address','denom']`, `['delegator_address','validator_address']`). Not defining these causes duplicates or unintended overwrites.

- **Type/precision mismatches**:

  - Amounts, heights, ids often come as strings and can exceed JS number range. Keep as strings or cast with custom `NumberCast` only when safe.
  - Cosmos responses are snake_case; match model fields exactly to avoid transform boilerplate.

- **“Any” payloads**:

  - Fields like `account: Any<AccountI>` or `authorization: Any` vary by concrete type. Store as `Record<string, any>` or split discriminators carefully; do not assume a single shape.

- **Missing foreign keys in responses**:

  - Nested items often omit parents (e.g., `balance` lacks `address`). Inject FKs in `dataTransformer` or you can’t normalize relations.

- **Pagination handling**:

  - `pagination.next_key` is base64; pass it back verbatim, don’t JSON-stringify `"null"` or you’ll get 400s.
  - Decide where to store pagination metadata (in `_meta` or a separate `Page` model) and key it by the query params.

- **URL/query encoding**:

  - Params like `denom` may contain `/` (IBC denoms). Always build queries with `URLSearchParams` (no manual string concat) to avoid double/mis-encoding.

- **Address formats**:

  - Delegator (`cosmos1…`) vs validator (`cosmosvaloper1…`) are different. Map to the correct fields; don’t join on the wrong bech32 prefix.

- **Eager loading costs**:

  - `.withAll()`/`.withAllRecursive()` on large datasets can explode CPU/memory. Prefer targeted `.with()` and paginate first.

- **Save semantics**:

  - `persistBy: 'save'` upserts; can silently “update” stale records if keys collide. Use `'insert'` when you require strict non-overwrite, or add guards in hooks.

- **Hidden/visible fields**:

  - Hiding the primary key breaks `.find()`/relations. If using `static visible`, remember PKs are auto-added but don’t hide them via `hidden`.

- **Large/binary fields**:

  - Fields like `script.code` or `storage.data` can be huge. Consider storing summaries, using `extract` server param, or marking such fields hidden by default to keep store light.

- **Nulls and empty payloads**:

  - Some endpoints return `{ balance: null }` or empty arrays for “not found”. Transformers should normalize to `[]` (for collections) and skip inserts for nulls.

- **Date/time handling**:

  - Timestamps are RFC3339 strings. Use `DateCast` only if you truly need `Date` objects; otherwise keep strings to avoid TZ surprises.

- **Axios/baseURL quirks**:

  - Ensure `baseURL` + route don’t produce `//`. Prefer relative URLs in actions. Don’t swallow errors—rethrow so UI can handle (no empty `catch`).

- **Caching keys**:

  - If using `.useCache('key', params)`, include all query params (address, denom, page key) or you’ll serve stale/mismatched data.

- **Delete semantics**:

  - HTTP DELETE won’t auto-remove store data. Use the plugin’s `delete: id` option or call repository `destroy()` explicitly.

- **Concurrency/race conditions**:

  - Rapid successive requests (typing filters) can interleave; consider axios cancel tokens or guard latest-only saves to avoid flicker.

- **STI and circular imports**:

  - If you use STI for polymorphic records, follow the documented intermediate “hierarchy” file pattern to avoid circular import runtime errors.

- **SSR/outside setup**:

  - Using `useRepo` outside `setup()` requires passing the Pinia instance. Forgetting this causes “called outside of store” errors.

- **Validation of IDs**:

  - Proposal IDs, heights may look numeric but are strings. Don’t coerce; comparisons should be string-based unless safely parsed.

- **Governance/grants joins**:

  - Join by `proposal_id`, `depositor`, `voter`, `granter`, `grantee` exactly; small typos in field names silently break relations.
