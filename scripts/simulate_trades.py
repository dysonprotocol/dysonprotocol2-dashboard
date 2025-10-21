#!/usr/bin/env python3

import argparse
import json
import re
import shlex
import subprocess
import sys


def run_json(command: str) -> dict:
    """Run a shell command expected to produce JSON on stdout and parse it."""
    completed = subprocess.run(
        command,
        shell=True,
        capture_output=True,
        text=True,
    )
    if completed.returncode != 0:
        sys.stderr.write(f"Command failed: {command}\n{completed.stderr}\n")
        raise RuntimeError(f"command exited {completed.returncode}")
    return json.loads(completed.stdout)


def run_tx_and_wait(tx_command: str) -> dict:
    """Run a tx command and wait for it."""
    print(f"Running tx command: {tx_command}")
    tx_proc = subprocess.run(
        tx_command,
        shell=True,
        capture_output=True,
        text=True,
    )
    if tx_proc.returncode != 0:
        error_msg = f"tx exited {tx_proc.returncode}"
        if tx_proc.stderr:
            error_msg += f": {tx_proc.stderr.strip()}"
        sys.stderr.write(f"Tx failed\n")
        if tx_proc.stderr:
            sys.stderr.write(f"{tx_proc.stderr}\n")
        raise RuntimeError(error_msg)

    try:
        tx_json = json.loads(tx_proc.stdout)
    except json.JSONDecodeError:
        sys.stderr.write(f"Tx stdout not JSON: {tx_proc.stdout}\n")
        raise
    if int(tx_json.get("code", 0)) != 0:
        raw_log = tx_json.get("raw_log", "")
        sys.stderr.write(f"Tx rejected: {raw_log}\n")
        raise RuntimeError("tx rejected")

    wait_proc = subprocess.run(
        "dysond query wait-tx -o json",
        shell=True,
        input=tx_proc.stdout,
        capture_output=True,
        text=True,
    )
    if wait_proc.returncode != 0:
        error_msg = f"wait-tx exited {wait_proc.returncode}"
        if wait_proc.stderr:
            error_msg += f": {wait_proc.stderr.strip()}"
        sys.stderr.write(f"Wait-tx failed\n")
        if wait_proc.stderr:
            sys.stderr.write(f"{wait_proc.stderr}\n")
        raise RuntimeError(error_msg)

    return json.loads(wait_proc.stdout)


def get_offers_for_pair(base_denom: str, quote_denom: str) -> list[dict]:
    """Get all offers mentioning either denom."""
    offers = []
    for denom in [base_denom, quote_denom]:
        data = run_json(f'dysond query whaleswap offers-by-denom --denom "{denom}" -o json')
        offers.extend(data.get("offers", []))
    # Deduplicate by offer_id
    seen = set()
    unique_offers = []
    for offer in offers:
        oid = offer.get("offer_id")
        if oid not in seen:
            seen.add(oid)
            unique_offers.append(offer)
    return unique_offers


def get_pools_for_pair(base_denom: str, quote_denom: str) -> list[dict]:
    """Get all pools for the pair."""
    data = run_json(f'dysond query whaleswap pools-by-pair --base-denom "{base_denom}" --quote-denom "{quote_denom}" -o json')
    return data.get("pools", [])


def get_account_balances(account: str) -> list[dict]:
    """Get all balances for an account."""
    data = run_json(f'dysond query bank balances "{account}" -o json')
    return data.get("balances", [])


def get_pool_details(pool_id: str) -> dict | None:
    """Get detailed information for a specific pool."""
    try:
        pool_data = run_json(f'dysond query whaleswap pool {pool_id} -o json')
        return pool_data.get("pool")
    except:
        return None


def is_pool_balanced(pool: dict, input_denom: str) -> bool:
    """Check if a pool has reasonable balance for trading."""
    coins = pool.get("coins", [])
    if len(coins) != 2:
        return False

    # Find input and output coins
    input_coin = None
    output_coin = None
    for coin in coins:
        if coin.get("denom") == input_denom:
            input_coin = coin
        else:
            output_coin = coin

    if not input_coin or not output_coin:
        return False

    input_amount = int(input_coin.get("amount", "0"))
    output_amount = int(output_coin.get("amount", "0"))

    # Skip pools with zero amounts
    if input_amount == 0 or output_amount == 0:
        return False

    # Check balance ratio - skip if ratio is too extreme (>10:1 or <1:10)
    ratio = max(input_amount, output_amount) / min(input_amount, output_amount)
    if ratio > 10:
        return False

    # Skip pools with very small reserves (<1000 total tokens)
    total_reserves = input_amount + output_amount
    if total_reserves < 1000:
        return False

    return True


def get_all_trades_for_denom(denom: str) -> list[dict]:
    """Find all pools and offers involving a specific denom."""
    trades = []

    # Get offers for this denom
    offers_data = run_json(f'dysond query whaleswap offers-by-denom --denom "{denom}" -o json')
    offers = offers_data.get("offers", [])

    # Get all pools that contain this denom
    pools_data = run_json('dysond query whaleswap pools -o json')
    all_pools = pools_data.get("pools", [])
    candidate_pools = [pool for pool in all_pools if any(coin.get("denom") == denom for coin in pool.get("coins", []))]

    # Filter pools to only include balanced ones
    pools = []
    for pool in candidate_pools:
        pool_id = pool.get("pool_id")
        if pool_id and is_pool_balanced(pool, denom):
            pools.append(pool)

    # Convert to trade opportunities
    for offer in offers:
        if offer.get("status") == "open":
            trades.append({"type": "offer", "data": offer})

    for pool in pools:
        trades.append({"type": "pool", "data": pool})

    return trades


def find_best_buy_price(base_denom: str, quote_denom: str) -> dict | None:
    """Find best price to buy base using quote (lowest quote/base ratio)."""
    pools = get_pools_for_pair(base_denom, quote_denom)
    offers = get_offers_for_pair(base_denom, quote_denom)

    best_price = float('inf')
    best_deal = None

    # Check pools: price = quote/base
    for pool in pools:
        coins = pool.get("coins", [])
        if len(coins) != 2:
            continue
        c0, c1 = coins[0], coins[1]
        if c0["denom"] == base_denom and c1["denom"] == quote_denom:
            amt_base = int(c0["amount"])
            amt_quote = int(c1["amount"])
            if amt_base > 0:
                price = amt_quote / amt_base
                if price < best_price:
                    best_price = price
                    best_deal = {"type": "pool", "data": pool, "price": price}
        elif c0["denom"] == quote_denom and c1["denom"] == base_denom:
            amt_quote = int(c0["amount"])
            amt_base = int(c1["amount"])
            if amt_quote > 0:
                price = amt_base / amt_quote
                if price < best_price:
                    best_price = price
                    best_deal = {"type": "pool", "data": pool, "price": price}

    # Check offers: makers selling base for quote
    for offer in offers:
        if offer.get("status") != "open":
            continue
        have = offer.get("initial_have", {})
        want = offer.get("initial_want", {})
        if have.get("denom") == base_denom and want.get("denom") == quote_denom:
            amt_base = int(have.get("amount", "0"))
            amt_quote = int(want.get("amount", "0"))
            if amt_base > 0:
                price = amt_quote / amt_base
                if price < best_price:
                    best_price = price
                    best_deal = {"type": "offer", "data": offer, "price": price}

    return best_deal


def find_best_sell_price(base_denom: str, quote_denom: str) -> dict | None:
    """Find best price to sell base for quote (highest quote/base ratio)."""
    pools = get_pools_for_pair(base_denom, quote_denom)
    offers = get_offers_for_pair(base_denom, quote_denom)

    best_price = 0
    best_deal = None

    # Check pools: price = quote/base
    for pool in pools:
        coins = pool.get("coins", [])
        if len(coins) != 2:
            continue
        c0, c1 = coins[0], coins[1]
        if c0["denom"] == base_denom and c1["denom"] == quote_denom:
            amt_base = int(c0["amount"])
            amt_quote = int(c1["amount"])
            if amt_base > 0:
                price = amt_quote / amt_base
                if price > best_price:
                    best_price = price
                    best_deal = {"type": "pool", "data": pool, "price": price}
        elif c0["denom"] == quote_denom and c1["denom"] == base_denom:
            amt_quote = int(c0["amount"])
            amt_base = int(c1["amount"])
            if amt_quote > 0:
                price = amt_base / amt_quote
                if price > best_price:
                    best_price = price
                    best_deal = {"type": "pool", "data": pool, "price": price}

    # Check offers: makers buying base with quote
    for offer in offers:
        if offer.get("status") != "open":
            continue
        have = offer.get("initial_have", {})
        want = offer.get("initial_want", {})
        if have.get("denom") == quote_denom and want.get("denom") == base_denom:
            amt_quote = int(have.get("amount", "0"))
            amt_base = int(want.get("amount", "0"))
            if amt_quote > 0:
                price = amt_base / amt_quote
                if price > best_price:
                    best_price = price
                    best_deal = {"type": "offer", "data": offer, "price": price}

    return best_deal


def collect_trade_operations(trades: list[dict], input_denom: str, amount: int) -> tuple[list[dict], list[str]]:
    """Collect trade operations and determine output denoms."""
    operations = []
    output_denoms = []

    for trade in trades:
        output_denom = None

        if trade["type"] == "pool":
            pool = trade["data"]
            pool_id = pool["pool_id"]
            coins = pool.get("coins", [])
            if len(coins) == 2:
                # Find input and output coins
                input_coin = None
                output_coin = None
                for coin in coins:
                    if coin.get("denom") == input_denom:
                        input_coin = coin
                    else:
                        output_coin = coin
                        output_denom = coin.get("denom")

                if input_coin is None or output_coin is None:
                    continue  # Skip if we can't find both coins

                # For swap_in, we specify the exact input amount we want to provide
                op = {
                    "swap": {
                        "pool_id": pool_id,
                        "swap_in": {"denom": input_denom, "amount": str(amount)}
                    }
                }
                operations.append(op)
                if output_denom not in output_denoms:
                    output_denoms.append(output_denom)
        else:
            # Skip offers for now to avoid accounting issues during stress testing
            continue

    return operations, output_denoms


def execute_batch_trades(from_acct: str, operations: list[dict], max_inputs: list[str], min_outputs: list[str], gas_flags: str = "") -> dict:
    """Execute multiple trade operations in a single transaction."""
    # Build command with multiple --op, --max-input, and --min-output flags
    cmd_parts = [
        "dysond tx whaleswap make-trade",
        f"--from {shlex.quote(from_acct)}"
    ]

    # Add max-input flags
    for max_input in max_inputs:
        cmd_parts.append(f"--max-input \"{max_input}\"")

    # Add operation flags
    for op in operations:
        op_q = shlex.quote(json.dumps(op))
        cmd_parts.append(f"--op {op_q}")

    # Add min-output flags
    for min_output in min_outputs:
        cmd_parts.append(f"--min-output \"{min_output}\"")

    # Add other flags
    cmd_parts.extend([gas_flags, "-y -o json --gas auto"])

    cmd = " ".join(cmd_parts)
    print(f"Executing batch transaction with {len(operations)} operations...")
    tx = run_tx_and_wait(cmd)

    return tx


def main() -> None:
    parser = argparse.ArgumentParser(description="Stress test make-trade by executing multiple small trades in a single transaction for all denoms in account balance")
    parser.add_argument("--from", dest="from_acct", required=True, help="key name")
    parser.add_argument("--gas-flags", default="", help="Optional gas flags")
    args = parser.parse_args()

    print(f"Account: {args.from_acct}")

    # Get account balances
    balances = get_account_balances(args.from_acct)
    print(f"Found {len(balances)} denoms in balance")

    # Collect all operations across all denoms
    all_operations = []
    all_output_denoms = set()
    input_denom_limits = {}  # Track how much of each input denom we're using

    # For each denom with positive balance, find trade opportunities
    for balance in balances:
        denom = balance.get("denom")
        available_amount = int(balance.get("amount", "0"))

        if available_amount <= 0:
            continue

        print(f"\nProcessing denom: {denom} (balance: {available_amount})")

        # Find all trade opportunities for this denom
        trades = get_all_trades_for_denom(denom)
        print(f"Found {len(trades)} trade opportunities")

        # Use small fixed amount for reliable testing (avoids pool constraints)
        trade_amount = 100
        if available_amount < trade_amount:
            trade_amount = max(1, available_amount)  # Use what's available, minimum 1
        print(f"Using trade amount: {trade_amount} (small fixed test amount)")

        # Collect operations for this denom
        operations, output_denoms = collect_trade_operations(trades, denom, trade_amount)
        print(f"Collected {len(operations)} valid operations")

        # Only add operations if we have enough balance for them
        max_operations = available_amount // trade_amount
        operations_to_add = min(len(operations), max_operations)
        if operations_to_add > 0:
            all_operations.extend(operations[:operations_to_add])
            all_output_denoms.update(output_denoms)
            input_denom_limits[denom] = operations_to_add * trade_amount  # Track total amount used from this denom

    if not all_operations:
        print("No valid trade operations found. Exiting.")
        return

    # Build max_inputs list: small limits for inputs since we're using small test amounts
    max_inputs = [f"{amount}{denom}" for denom, amount in input_denom_limits.items()]

    # Build min_outputs: don't enforce minimums since we're testing functionality
    # The AMM will determine actual outputs, we just want operations to work
    min_outputs = []

    print(f"\nTotal operations to execute: {len(all_operations)}")
    print(f"Input denoms: {list(input_denom_limits.keys())}")
    print(f"Output denoms: {sorted(all_output_denoms)}")

    # Execute all operations in a single batch transaction
    try:
        tx = execute_batch_trades(args.from_acct, all_operations, max_inputs, min_outputs, args.gas_flags)

        # Count successful trades
        trade_count = 0
        for e in tx.get("events", []):
            if e.get("type", "").startswith("dysonprotocol"):
                for a in e.get("attributes", []):
                    if a.get("key") == "trade_id":
                        trade_count += 1

        print(f"Batch transaction completed with {trade_count} trades executed")

    except Exception as e:
        error_msg = str(e)
        

if __name__ == "__main__":
    main()


