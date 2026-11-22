# Credit ledger concurrency verification

## Execution method
Two independent Supabase SQL executions were launched concurrently against the same individual workspace and the same verification-run debit idempotency key. The account-row lock in the credit-ledger insert trigger serializes both operations.

## Observed concurrent debit outcomes
- Request A: `status=consumed`
- Request B: `status=already_consumed`
- Both responses returned the same ledger entry ID.
- Final balance after the single debit: 0.

## Observed concurrent reversal outcomes
Two independent SQL executions were launched concurrently against the same debit entry and reversal idempotency key.

- Request A: `status=reversed`
- Request B: `status=already_reversed`
- Both responses returned the same reversal entry ID.
- Final balance after reversal: 1.

## Cleanup
The fixture purchase credit was offset by an immutable `expiry` ledger entry. The test account and workspace were suspended, and the test order, payment, entitlement, run, and membership rows were removed. Four immutable ledger rows remain as an audit trail, with a net fixture balance of zero.

## Scope
This is a real concurrent database execution test of the deployed SQL RPCs. It does not replace a concurrent end-to-end test through the payment provider webhook and application API.
