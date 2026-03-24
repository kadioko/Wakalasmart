# WakalaSmart Financial Engine

## Overview

WakalaSmart uses a **dual-ledger architecture**: every transaction writes to one or both of two append-only tables — `CashLedgerEntry` and `FloatLedgerEntry`. Balances are never stored as mutable columns; they are always derived from the last `balanceAfter` in each ledger.

---

## Transaction Type Reference

### Legend

| Symbol | Meaning |
|--------|---------|
| ➕ CREDIT | Balance increases |
| ➖ DEBIT | Balance decreases |
| — | No effect |
| ⚠️ | Approval required |

---

### 1. DEPOSIT (Cash In / M-Pesa Deposit)

**Business meaning:** A customer hands the agent cash. The agent logs into the provider portal and sends float to the customer's mobile wallet. The agent receives cash, the float account decreases.

| Dimension | Value |
|-----------|-------|
| Cash effect | ➕ CREDIT (agent receives physical cash) |
| Float effect | ➖ DEBIT on provider till (float sent to customer) |
| Commission | ➕ EARNED — provider pays per transaction |
| Approval | None for standard amounts. ⚠️ Flag if > TZS 5,000,000 |
| Reversal | Float is returned (➕ float), cash is returned to customer (➖ cash) |

**Validation rules:**
- Amount > 0, max TZS 100,000,000
- `providerId` required
- Active open shift required
- Float balance must be ≥ amount (prevent overdraft)
- Reference number format: provider-specific (M-Pesa: 10 alphanumeric)

**Fraud risks:**
- Agent records fake deposit to inflate commission count
- Agent uses personal phone to self-deposit (agent as customer)
- Cashier deposits cash without entering into system (skimming)
- Duplicate reference: same M-Pesa confirmation used twice

**Reconciliation impact:**
- Cash box increases by `amount`
- Float account (provider) decreases by `amount`
- Commission accrued for the day

---

### 2. WITHDRAWAL (Cash Out)

**Business meaning:** Customer wants cash. They send float from their wallet to the agent's till number. Agent gives physical cash to customer.

| Dimension | Value |
|-----------|-------|
| Cash effect | ➖ DEBIT (agent pays out cash) |
| Float effect | ➕ CREDIT on provider till (float received from customer) |
| Commission | ➕ EARNED — provider pays per withdrawal |
| Approval | ⚠️ Flag if > TZS 3,000,000 (large cash out) |
| Reversal | Cash returned by customer (➕ cash), float returned (➖ float) |

**Validation rules:**
- Cash balance must be ≥ amount (cannot pay what you don't have)
- `providerId` required
- Reference (M-Pesa confirmation) required
- Check duplicate reference

**Fraud risks:**
- Agent pays out cash but doesn't record the transaction
- "Ghost withdrawal" — record transaction without handing cash
- Customer claims non-receipt; agent keeps cash
- Collusion: cashier + customer fake withdrawal, split cash

**Reconciliation impact:**
- Cash box decreases by `amount`
- Float account (provider) increases by `amount`

---

### 3. FLOAT_PURCHASE (Buying Float from Distributor)

**Business meaning:** Agent buys float from a super-agent or bank. Agent pays cash; float account is credited. This replenishes the float needed to serve customers.

| Dimension | Value |
|-----------|-------|
| Cash effect | ➖ DEBIT (agent pays cash to buy float) |
| Float effect | ➕ CREDIT on provider till |
| Commission | — None (cost of operations) |
| Approval | ⚠️ Owner should approve large purchases |
| Reversal | Float reversed (➖ float), cash returned (➕ cash) |

**Validation rules:**
- Cash balance ≥ purchase amount
- `providerId` required
- Reference: distributor receipt number

**Fraud risks:**
- Record float purchase without actually paying (fake cash deduction to hide theft)
- Inflate purchase amount — pocket the difference
- Purchase float from unauthorized distributor

**Reconciliation impact:**
- Cash decreases, float increases by same amount
- Net cash position changes; float position improves

---

### 4. AIRTIME_SALE

**Business meaning:** Agent sells airtime/data vouchers to customers. Customer pays cash, agent uses float to send airtime credit via provider portal.

| Dimension | Value |
|-----------|-------|
| Cash effect | ➕ CREDIT (cash received from customer) |
| Float effect | ➖ DEBIT (float used to fund airtime) |
| Commission | ➕ EARNED — small margin on airtime |
| Approval | None |
| Reversal | Cash returned (➖ cash), float restored (➕ float) |

**Validation rules:**
- Amount must be standard denomination (TZS 500, 1000, 2000, 5000, 10000)
- `providerId` required
- Customer phone number recommended

**Fraud risks:**
- Agent sells airtime for cash but buys at credit (double-dip if provider gives credit float)
- Airtime sold, cash not recorded
- Over-recording to inflate commission (if commission is per transaction count)

---

### 5. BILL_PAYMENT (Lipa Bili)

**Business meaning:** Customer pays a utility bill (LUKU electricity, DAWASCO water, DSTV) via the agent. Customer pays cash; agent processes payment on provider platform using float.

| Dimension | Value |
|-----------|-------|
| Cash effect | ➕ CREDIT |
| Float effect | ➖ DEBIT |
| Commission | ➕ EARNED per transaction |
| Approval | None |
| Reversal | If bill payment bounces from utility — cash returned, float restored |

**Validation rules:**
- Bill reference number required (meter number, account number)
- `providerId` required
- Amount must match bill amount

**Fraud risks:**
- Paying own utility bills using business float (personal use)
- Double-charging customer (cash + digital payment)
- Entering wrong meter number; customer doesn't get power

---

### 6. MERCHANT_PAYMENT (Lipa kwa Biashara)

**Business meaning:** Customer pays a merchant via the agent's float (e.g., Lipa na M-Pesa till). Customer gives cash, agent sends merchant payment from float.

| Dimension | Value |
|-----------|-------|
| Cash effect | ➕ CREDIT |
| Float effect | ➖ DEBIT |
| Commission | ➕ EARNED (varies by merchant agreement) |
| Approval | None |
| Reversal | Cash returned, float restored |

**Validation rules:**
- Merchant till/pay-bill number required as reference
- `providerId` required

**Fraud risks:**
- Agent sends to own merchant number (self-dealing)
- Customer's phone confirms but agent claims it failed (double payment)

---

### 7. TRANSFER (Send Money)

**Business meaning:** Customer sends money to another person. Customer pays cash (amount + fee). Agent processes transfer on provider platform using float.

| Dimension | Value |
|-----------|-------|
| Cash effect | ➕ CREDIT (cash + fee received) |
| Float effect | ➖ DEBIT (amount + fee sent from float) |
| Commission | ➕ EARNED — transfer fee commission |
| Approval | ⚠️ Flag if > TZS 2,000,000 (AML compliance) |
| Reversal | Full amount + fee reversed |

**Validation rules:**
- Recipient phone number required (Tanzanian format)
- Reference required
- Float balance ≥ (amount + fee)
- Check duplicate reference

**Fraud risks:**
- Transfer to own number / family number (self-dealing)
- "Failed transfer" — customer's float deducted but agent keeps cash
- High-value transfers without proper ID verification

---

### 8. EXPENSE

**Business meaning:** Business expense paid in cash from the cash box (rent, utilities, transport, salaries, supplies).

| Dimension | Value |
|-----------|-------|
| Cash effect | ➖ DEBIT |
| Float effect | — None |
| Commission | — None (cost, not revenue) |
| Approval | ⚠️ Amounts > TZS 500,000 should require owner approval |
| Reversal | Cash returned (➕ cash) if expense was wrongly recorded |

**Validation rules:**
- Category required (RENT, UTILITIES, SALARIES, etc.)
- Description required (min 5 chars)
- Receipt reference recommended for audits

**Fraud risks:**
- Inflated expense amounts (pay TZS 100K rent, record TZS 200K)
- Fake expenses to drain cash box
- Personal expenses charged to business

**Reconciliation impact:**
- Reduces cash balance; shows as operating cost in P&L
- High expense variance triggers alert

---

### 9. OWNER_WITHDRAWAL

**Business meaning:** Business owner takes profit or personal money from the cash box. Not an expense — it's an equity withdrawal.

| Dimension | Value |
|-----------|-------|
| Cash effect | ➖ DEBIT |
| Float effect | — None |
| Commission | — None |
| Approval | ⚠️ Must be recorded by Owner role only |
| Reversal | Cash returned (owner injects back) |

**Validation rules:**
- Only `OWNER` role can create this type
- Cash balance ≥ amount (cannot overdraft for owner withdrawal)
- Notes/reason required

**Fraud risks:**
- Manager or cashier creates fake owner withdrawal to steal cash
- Owner under-records withdrawal amount to avoid tax/scrutiny

---

### 10. OWNER_INJECTION (Capital Injection)

**Business meaning:** Owner injects personal capital into the business — adds cash to the float purchasing fund or operational float.

| Dimension | Value |
|-----------|-------|
| Cash effect | ➕ CREDIT |
| Float effect | — None (unless buying float immediately) |
| Commission | — None |
| Approval | None (owner action) |
| Reversal | Owner withdraws the injection back |

**Validation rules:**
- Only `OWNER` role can create
- Notes required (source of funds — bank, personal savings)

**Fraud risks:**
- Recording fake injections to balance books after theft
- Inflating injection to cover unrecorded transactions

---

### 11. MANUAL_ADJUSTMENT

**Business meaning:** Correcting a ledger balance error that cannot be fixed via reversal. Used sparingly — e.g., system migration, data import, reconciliation discrepancy correction.

| Dimension | Value |
|-----------|-------|
| Cash effect | ➕ CREDIT or ➖ DEBIT (specified by operator) |
| Float effect | ➕ CREDIT or ➖ DEBIT (specified by operator) |
| Commission | — None |
| Approval | ⚠️ OWNER or BRANCH_MANAGER required. Audit log mandatory |
| Reversal | Create a counter-adjustment |

**Validation rules:**
- Adjustment reason required (min 20 chars)
- Approval by a second user required (role separation)
- Cannot exceed ±TZS 10,000,000 without super_admin review

**Fraud risks:**
- Using adjustments to cover stolen cash
- Repeated adjustments masking systematic theft

---

### 12. REVERSAL

**Business meaning:** A previous transaction is voided — usually because it was entered incorrectly, was fraudulent, or the provider reversed it. The original transaction is marked VOID and a reversing entry is created.

| Dimension | Value |
|-----------|-------|
| Cash effect | Opposite of original transaction |
| Float effect | Opposite of original transaction |
| Commission | Negative commission (clawed back) |
| Approval | ⚠️ BRANCH_MANAGER or OWNER required |
| Reversal of reversal | Not allowed — create new correcting transaction |

**Validation rules:**
- Original transaction ID required
- Original must be status COMPLETED (not already VOID)
- Reason required (min 10 chars)
- Cannot reverse transactions older than 30 days without super_admin

**Fraud risks:**
- Reversing completed transactions to steal cash
- High reversal rate indicates systematic fraud
- Cashier reversing own transactions to pocket cash

**Reconciliation impact:**
- HIGH_REVERSALS alert triggers if daily reversals > 3 or > TZS 500,000

---

### 13. INTER_BRANCH_TRANSFER

**Business meaning:** Moving cash or float between branches of the same organization. Branch A sends float to Branch B.

| Dimension | Value |
|-----------|-------|
| Cash effect | ➖ DEBIT at source branch |
| Float effect | ➖ DEBIT at source (if float) / ➕ CREDIT at destination |
| Commission | — None (internal) |
| Approval | ⚠️ BRANCH_MANAGER or OWNER both branches |
| Reversal | Both branches reverse their entries |

**Validation rules:**
- Source and destination branch IDs required
- Both branches must belong to same organization
- Reference/transfer code required

**Fraud risks:**
- Fake transfers between branches to hide balance discrepancies
- Transfer recorded at source but not at destination

---

### 14. BANK_DEPOSIT

**Business meaning:** Agent deposits excess cash into bank account to reduce cash-holding risk.

| Dimension | Value |
|-----------|-------|
| Cash effect | ➖ DEBIT (cash leaves the till) |
| Float effect | — None |
| Commission | — None |
| Approval | ⚠️ OWNER recommended |
| Reversal | Bank returns funds (rare) |

**Validation rules:**
- Bank slip reference required
- Amount ≤ current cash balance

---

### 15. BANK_WITHDRAWAL

**Business meaning:** Agent withdraws cash from bank to replenish cash box (e.g., after buying float depleted cash).

| Dimension | Value |
|-----------|-------|
| Cash effect | ➕ CREDIT |
| Float effect | — None |
| Commission | — None |
| Approval | ⚠️ OWNER recommended |
| Reversal | Cash returned to bank |

**Validation rules:**
- Bank slip/ATM reference required

---

## Ledger Architecture

### Dual-Ledger Model

WakalaSmart uses two parallel append-only ledger tables instead of mutable balance columns:

```
CashLedgerEntry
  id, organizationId, branchId, tillId
  type: CREDIT | DEBIT
  amount: Decimal
  balanceAfter: Decimal   ← running total
  transactionId, shiftId
  createdAt

FloatLedgerEntry
  id, organizationId, branchId, tillId, providerId
  type: CREDIT | DEBIT
  amount: Decimal
  balanceAfter: Decimal   ← running total
  transactionId, shiftId
  createdAt
```

**Why no balance columns?**
1. Eliminates race conditions — two concurrent transactions cannot corrupt a single balance field
2. Full audit trail — every balance change is traceable to a transaction
3. Point-in-time queries — reconstruct balance at any moment
4. Reconciliation — compare ledger sum to physical count

### Ledger Impact Map

```
Transaction Type     | Cash      | Float
---------------------|-----------|--------
DEPOSIT              | +CREDIT   | -DEBIT
WITHDRAWAL           | -DEBIT    | +CREDIT
FLOAT_PURCHASE       | -DEBIT    | +CREDIT
AIRTIME_SALE         | +CREDIT   | -DEBIT
BILL_PAYMENT         | +CREDIT   | -DEBIT
MERCHANT_PAYMENT     | +CREDIT   | -DEBIT
TRANSFER             | +CREDIT   | -DEBIT
EXPENSE              | -DEBIT    | none
OWNER_WITHDRAWAL     | -DEBIT    | none
OWNER_INJECTION      | +CREDIT   | none
BANK_DEPOSIT         | -DEBIT    | none
BANK_WITHDRAWAL      | +CREDIT   | none
REVERSAL             | opposite  | opposite
MANUAL_ADJUSTMENT    | ±         | ±
INTER_BRANCH_TRANSFER| -DEBIT    | -DEBIT (source)
```

---

## Balance Derivation Rules

### Current Balance

```
currentBalance = (SELECT balanceAfter FROM CashLedgerEntry
                  WHERE tillId = $tillId
                  ORDER BY createdAt DESC
                  LIMIT 1)
```

If no entries exist: `currentBalance = 0`

### Running Total Append Algorithm

```typescript
async function appendCashLedgerEntry(tillId, type, amount, tx) {
  const last = await tx.cashLedgerEntry.findFirst({
    where: { tillId },
    orderBy: { createdAt: 'desc' }
  });

  const prev = last?.balanceAfter ?? 0;
  const next = type === 'CREDIT' ? prev + amount : prev - amount;

  if (next < 0) throw new Error('Insufficient cash balance');

  return tx.cashLedgerEntry.create({
    data: { tillId, type, amount, balanceAfter: next, ... }
  });
}
```

### All Ledger Entries Within a Prisma `$transaction`

The transaction record + cash ledger entry + float ledger entry are always created atomically:

```typescript
await db.$transaction(async (tx) => {
  const txn = await tx.transaction.create({ ... });
  await appendCashLedgerEntry({ tillId, type, amount }, tx);
  await appendFloatLedgerEntry({ tillId, providerId, type, amount }, tx);
  await createAuditLog({ ... });
});
```

---

## End-of-Day Reconciliation Formulas

### Cash Reconciliation

```
Opening Cash Balance
= balanceAfter of last CashLedgerEntry before shift start

Expected Closing Cash
= Opening Cash
  + Σ(amount WHERE type=CREDIT AND shiftId=X)
  - Σ(amount WHERE type=DEBIT AND shiftId=X)

Actual Cash
= Physical count entered by cashier

Cash Variance
= Actual Cash - Expected Closing Cash

Variance Type
  > 0 → Overage (extra cash — possible unrecorded transaction or counting error)
  < 0 → Shortage (missing cash — possible theft or missed transaction)
  = 0 → Balanced ✓
```

### Float Reconciliation (per Provider)

```
Opening Float (provider P)
= balanceAfter of last FloatLedgerEntry for providerId=P before shift start

Expected Closing Float
= Opening Float
  + Σ(CREDIT entries for P during shift)
  - Σ(DEBIT entries for P during shift)

Actual Float
= Physical count or provider portal balance entered

Float Variance
= Actual Float - Expected Closing Float
```

### Commission & P&L

```
Gross Commission Today
= Σ(commission WHERE status=COMPLETED AND date=today)

Total Expenses Today
= Σ(amount WHERE type=EXPENSE AND date=today)

Net Operating Income
= Gross Commission - Total Expenses

Float Purchases Today
= Σ(amount WHERE type=FLOAT_PURCHASE AND date=today)

Net Cash Movement
= Cash Credits - Cash Debits (excluding float purchases treated as asset swap)
```

### Unreconciled Days

```
Unreconciled branches
= branches WHERE last ReconciliationRecord.status != APPROVED
  AND today > last approved date + 1 day
```

---

## Edge Cases & Safeguards

### 1. Negative Balance Prevention

```typescript
if (type === 'DEBIT' && prev - amount < 0) {
  throw new AppError('INSUFFICIENT_BALANCE',
    `Cash balance TZS ${prev.toLocaleString()} is less than TZS ${amount.toLocaleString()}`);
}
```

Float overdraft check runs before inserting ledger entry.

### 2. Concurrent Transactions (Race Condition)

All balance reads and ledger writes happen inside a single `db.$transaction()` with Prisma's serializable isolation. If two cashiers submit simultaneously:
- One succeeds
- The other gets a transaction rollback and should retry

### 3. Duplicate Reference Detection

Before creating any transaction with a reference number:

```typescript
const existing = await db.transaction.findFirst({
  where: {
    organizationId,
    reference,
    status: { not: 'VOID' }
  }
});
if (existing) throw new AppError('DUPLICATE_REFERENCE', 'This reference has already been used');
```

### 4. Shift Boundary Balance Carryover

When a new shift opens:
- Read `getCurrentBalance()` for each till
- Record as shift opening balance in `ShiftTill` table
- Opening ledger entry created with `type: CREDIT` at current balance (no net effect — just anchoring point)

### 5. No Open Shift Guard

Transactions cannot be created without an open shift:

```typescript
const shift = await db.shift.findFirst({
  where: { branchId, status: 'OPEN', ... }
});
if (!shift) throw new AppError('NO_OPEN_SHIFT', 'Open a shift before recording transactions');
```

### 6. Provider Offline / Float Not Credited

If float is purchased but provider portal shows no credit:
1. Record `FLOAT_PURCHASE` as normal
2. If provider later confirms it failed: create a `REVERSAL` of the float purchase
3. Use `notes` field to document the dispute reference

### 7. Manual Adjustment Audit Trail

Every `MANUAL_ADJUSTMENT` must:
- Have a reason (min 20 chars)
- Be approved by a different user than the creator (`approvedById !== createdById`)
- Trigger an `AuditLog` entry with `MANUAL_ADJUSTMENT` action
- Trigger a `HIGH_ADJUSTMENT` alert to owner

### 8. Reversal of Already-Reversed Transaction

```typescript
if (original.status === 'VOID') {
  throw new AppError('ALREADY_VOID', 'This transaction has already been reversed');
}
```

### 9. Stale Shift Detection

Alert fires if a shift was opened > 16 hours ago and not closed:

```
SHIFT_NOT_CLOSED alert
= shifts WHERE status=OPEN AND openedAt < NOW() - 16 hours
```

### 10. Reconciliation Deadline

If no approved reconciliation exists for yesterday:

```
RECONCILIATION_OVERDUE alert fires at 10:00 AM for all unconciled branches
```

---

## Summary: Financial Integrity Checklist

| Control | Mechanism |
|---------|-----------|
| No balance drift | Derived from ledger, never stored |
| No concurrent corruption | Prisma `$transaction()` |
| No duplicate transactions | Reference uniqueness check |
| No unauthorized voids | Role-based void (`BRANCH_MANAGER`+) |
| No untracked adjustments | Manual adjustment audit + approval |
| No cash without shift | Shift guard on transaction create |
| No float overdraft | Pre-debit balance check |
| Daily close verification | Reconciliation workflow |
| Full history | Immutable audit log |
| Loss detection | Variance alerts on reconciliation |
