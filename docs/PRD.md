# WakalaSmart — Product Requirements Document (PRD)
**Version:** 1.0
**Date:** 2026-03-23
**Status:** Active — MVP
**Author:** Engineering Team

---

## 1. Executive Summary

WakalaSmart is a vertical SaaS operating system built specifically for Tanzanian mobile money agent businesses ("wakalas"). It is not a generic bookkeeping app or a simple POS. It is a purpose-built daily control center that gives wakala owners and managers real-time visibility into cash, float, staff activity, branch performance, and profitability — while systematically reducing losses and improving accountability.

**Core product promise:**
> Give every wakala owner the same operational control that large financial institutions have — affordably, on any device, in real time.

---

## 2. Problem Statement

Tanzanian wakalas operate in a high-volume, cash-intensive environment with significant manual processes and limited tooling. The result is predictable and avoidable losses.

### Primary Pain Points

| Pain Point | Impact |
|---|---|
| Missing cash at end of day | Direct financial loss |
| Float mismatches across providers | Lost transactions, customer loss |
| Unrecorded transactions | Invisible leakage |
| Staff theft and manipulation | High trust cost |
| Fake SMS confirmations | Fraud exposure |
| Reversal disputes | Revenue disputes |
| No branch visibility for multi-shop owners | Operational blindness |
| No clean end-of-day reconciliation | Hours wasted, errors propagated |
| No profitability tracking by service | Cannot optimize float allocation |
| No real-time alerts | Reactive, not proactive management |

### Why This Problem Is Unsolved Today

- Generic accounting apps (QuickBooks, Wave) lack wakala-specific workflows
- Basic POS systems don't model float, commissions, or mobile money reconciliation
- Manual spreadsheets break down with multiple staff, shifts, or branches
- No local SaaS product addresses this vertical with the right depth

---

## 3. User Personas

### 3.1 Amina — Multi-Branch Wakala Owner
- **Age:** 38, Dar es Salaam
- **Operations:** 3 branches, 8 staff, handles M-Pesa + Airtel + Tigo
- **Pain:** Cannot see what's happening across branches in real time. End-of-day calls to managers are unreliable. Has experienced two staff theft incidents in the past year.
- **Goal:** One screen that shows all branches, cash, float, and alerts instantly.

### 3.2 Juma — Single-Shop Cashier
- **Age:** 24, Arusha
- **Operations:** Works a morning shift, handles 100–200 transactions/day
- **Pain:** Manual notebooks for recording transactions. Boss questions discrepancies. No way to prove his shift was clean.
- **Goal:** Fast, simple transaction entry that gives him a clean shift record.

### 3.3 Fatuma — Branch Manager
- **Age:** 31, Mwanza
- **Operations:** Manages 2 branches, reviews cashier performance
- **Pain:** Reconciliation is slow and manual. Cannot approve remotely. Doesn't know if float is running low until cashier calls.
- **Goal:** Remote visibility, fast approvals, automated alerts.

### 3.4 Ibrahim — Accountant / Auditor
- **Age:** 44, Dodoma
- **Operations:** Part-time accountant for a 5-branch operation
- **Pain:** Gets spreadsheets sent by WhatsApp. Hard to verify, easy to manipulate.
- **Goal:** Read-only access to clean, exportable reports and audit trails.

### 3.5 Platform Super Admin (Internal)
- **Operations:** Manages all tenant organizations on the WakalaSmart platform
- **Goal:** Monitor tenant health, billing, usage, support escalations.

---

## 4. Value Proposition

| Persona | Value Delivered |
|---|---|
| Owner | Real-time cross-branch visibility, loss alerts, profit clarity |
| Manager | Remote reconciliation, staff accountability, approval workflows |
| Cashier | Fast transaction entry, clean shift records, less confrontation |
| Accountant | Clean exportable reports, audit trail, no manipulation risk |
| Platform Admin | Managed multi-tenant SaaS revenue stream |

**Unique differentiation:**
1. Built specifically for Tanzania mobile money operations
2. Float + cash dual-ledger architecture (not a single balance)
3. Reconciliation wizard designed for daily wakala workflow
4. Commission tracking per provider/service
5. Loss prevention built into the core, not bolted on

---

## 5. MVP Scope

### In MVP

| Module | Description |
|---|---|
| Auth | Registration, login, password reset, session management |
| Onboarding | Organization setup wizard |
| Branches | Create, manage, assign staff |
| Staff/Users | Invite, role assignment, branch assignment |
| Providers | M-Pesa, Airtel Money, Tigo Pesa, HaloPesa |
| Tills | Cash boxes and float accounts per branch |
| Transactions | Record all transaction types, reference validation |
| Cash Ledger | Cash movement tracking per branch/till |
| Float Ledger | Float movement per provider per branch |
| Expenses | Record and categorize expenses |
| Shifts | Open/close shifts, shift-based reconciliation |
| Reconciliation | Daily reconciliation wizard with variance reporting |
| Dashboard | Owner + manager + cashier dashboards |
| Reports | 6 core reports with CSV export |
| Alerts | Low float, low cash, suspicious activity |
| Audit Logs | All sensitive actions logged immutably |
| Settings | Organization and branch-level configuration |
| Super Admin | Tenant management panel |

### Not in MVP (Post-MVP Roadmap)

- PDF export
- Swahili localization
- Subscription/billing system
- Mobile app (React Native)
- Bank/agency banking integration
- Airtime and bundles tracking
- Merchant payment tracking
- SMS/WhatsApp notifications
- Multi-currency (USD/EUR)
- Advanced AI anomaly detection
- Payroll integration
- API webhooks for third-party integrations

---

## 6. Functional Requirements

### FR-001: Authentication
- User can register with email + password
- User can log in with email + password
- User can reset password via email
- Sessions expire after configurable idle time
- MFA support in post-MVP
- Invitation-based onboarding for staff

### FR-002: Organization Management
- Owner creates organization during onboarding
- Organization has: name, type, TIN (optional), contact, timezone, currency (TZS fixed)
- Owner can update organization settings
- Organization can be suspended by super admin

### FR-003: Branch Management
- Organization can have 1–N branches
- Branch has: name, location, contact, operating hours, status
- Branch can be active or inactive
- Users are assigned to branches
- Tills belong to branches

### FR-004: User & Staff Management
- Owner invites staff by email
- Staff receives invitation link
- Roles: owner, branch_manager, cashier, accountant
- User can be assigned to one or more branches
- Role controls what they see and can do
- User can be deactivated without deletion

### FR-005: Provider Management
- Organization enables providers from: M-Pesa, Airtel Money, Tigo Pesa, HaloPesa
- Each provider has: name, code, commission rates (configurable), status
- Float accounts tied to providers per branch

### FR-006: Till Management
- Till types: cash_box, float_account
- Each branch has at least one cash till and one float till per provider
- Tills have opening balance set at shift start
- Till balance derived from ledger entries

### FR-007: Transaction Recording
- Cashier records transactions with: type, amount, provider, reference, fee, commission, notes
- Transaction types: deposit, withdrawal, float_purchase, airtime, bill_payment, transfer, reversal, adjustment, expense, owner_withdrawal, owner_injection, bank_deposit, bank_withdrawal, inter_branch_transfer
- Reference number deduplication warning per organization
- Transactions require an open shift if shift mode is enabled
- Transactions are immutable after submission; corrections via reversals or adjustments

### FR-008: Cash & Float Ledger
- Every transaction creates one or more ledger entries
- Cash and float balances are derived from ledger entries
- Opening balance set once per shift/day
- Cached daily summary for performance

### FR-009: Shift Management
- Cashier opens shift: records opening cash and float per provider
- Cashier closes shift: records counted closing cash and float
- System calculates expected vs actual
- Manager can review and approve closed shifts
- Shift must be open to record transactions (if setting enabled)

### FR-010: Daily Reconciliation
- Wizard-based flow for end-of-day
- Shows: opening balances, all movements, expected closing, actual input
- Variance highlighted with color coding
- Notes field for each variance
- Submit for approval
- Approver must be different from submitter if role separation enabled
- Locked after approval; edits require override with audit log

### FR-011: Expenses
- Record cash and non-cash expenses
- Categories: rent, utilities, airtime, transport, salaries, miscellaneous
- Expenses reduce cash balance
- Require approval if above threshold (configurable)

### FR-012: Dashboard
- Owner dashboard: all branches, totals, alerts, trends
- Manager dashboard: assigned branches
- Cashier dashboard: own shift, own tills only

### FR-013: Reports
- Daily summary, provider performance, cash movement, float movement, staff performance, branch performance, expense, variance/loss, commission, profit, shift summary, reconciliation history
- Filters: date range, branch, provider, user, type, status
- CSV export

### FR-014: Alerts
- Low cash threshold alert
- Low float threshold per provider
- Large transaction alert (above configurable threshold)
- Duplicate reference warning
- Unusual reversal frequency alert
- Unreconciled day alert
- Shift not closed alert

### FR-015: Audit Logs
- Immutable log for: all transaction writes, reconciliation events, setting changes, user management, approval actions, balance adjustments
- Filterable by: user, action type, date, branch
- Read-only UI with export

---

## 7. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | Dashboard loads < 2s on 3G; transaction submit < 1s |
| Availability | 99.5% uptime target for MVP |
| Security | OWASP Top 10 compliance; tenant isolation; encrypted at rest |
| Scalability | Support 100 organizations, 1000 branches, 10M transactions in first year |
| Mobile | Fully usable on 375px screens; touch-friendly targets |
| Accessibility | WCAG 2.1 AA for key flows |
| Localization | English first; i18n architecture for Swahili |
| Data Retention | 5-year financial record retention by default |
| Auditability | All financial changes traceable to user + timestamp |
| Backup | Daily automated database backup |

---

## 8. Assumptions

1. All monetary values in TZS (Tanzanian Shilling) only for MVP
2. Internet connectivity assumed (offline mode is post-MVP)
3. Each organization manages its own billing/subscription (billing UI is post-MVP)
4. Mobile money commission rates are input by the owner (not fetched from providers via API)
5. Proof-of-transaction attachments (screenshots/receipts) are post-MVP
6. The platform starts with single-database multi-tenant (shared schema with org isolation)
7. SMS confirmation verification is out of scope for MVP
8. Users operate from browsers, not a native mobile app in MVP

---

## 9. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Low user adoption due to manual habit | High | High | Simple UX; cashier onboarding flow; WhatsApp support |
| Data loss or corruption | Low | Critical | Ledger-based immutable architecture; daily backups |
| Staff circumventing system | Medium | High | Audit logs; shift enforcement; approval workflows |
| Incorrect balance calculations | Low | Critical | Ledger-derived balances; unit tests on all financial calculations |
| Tenant data leakage | Low | Critical | Row-level tenant isolation; comprehensive auth tests |
| Scope creep delaying MVP | High | Medium | Strict MVP scope enforcement; post-MVP backlog |
| Local connectivity issues | Medium | Medium | Fast page loads; optimistic UI; graceful offline messaging |

---

## 10. Success Metrics

### MVP Launch (Month 1–3)
- 10 paying organizations onboarded
- Average daily transaction entries per organization: > 50
- Reconciliation completion rate: > 80% of expected daily reconciliations
- User session duration: > 10 minutes/day for owners

### Growth (Month 3–12)
- 100 organizations
- < 2% reported data accuracy complaints
- NPS > 40
- < 5% monthly churn
- Average revenue per user (ARPU): TZS 50,000–150,000/month

### Product Health
- P95 API response time: < 500ms
- Zero critical security incidents
- > 95% uptime
- < 1% transaction entry error rate (user-reported)
