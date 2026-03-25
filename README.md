# WakalaSmart

**The Operating System for Tanzania's Mobile Money Agents**

WakalaSmart is a production-grade vertical SaaS platform built specifically for Tanzanian mobile money agent businesses (wakalas). It gives wakala owners, managers, and cashiers real-time visibility into cash, float, staff activity, branch performance, and profitability — while systematically reducing losses and improving accountability. Built on Next.js 16, Prisma 7, Better Auth, and PostgreSQL.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)
![Better Auth](https://img.shields.io/badge/Better_Auth-latest-green)
![TanStack Query](https://img.shields.io/badge/TanStack_Query-5-FF4154?logo=reactquery)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwindcss)

---

## Live Deployment Status

WakalaSmart is currently live with:

- **Frontend / App runtime:** Vercel
- **PostgreSQL database:** Railway

The production database has been seeded with demo data for role-based testing and walkthroughs.

For seeded demo users and test guidance, see [`docs/TEST_ACCOUNTS.md`](docs/TEST_ACCOUNTS.md).

---

## What is a Wakala?

A **wakala** is a mobile money agent in Tanzania — a shop that provides cash-in/cash-out services for providers like M-Pesa, Airtel Money, Tigo Pesa, and HaloPesa. Wakalas are the backbone of Tanzania's financial inclusion story, serving millions of unbanked citizens daily.

### The Problem

Wakalas operate in a high-volume, cash-intensive environment with significant manual processes and limited tooling:

| Pain Point | Impact |
|---|---|
| Missing cash at end of day | Direct financial loss |
| Float mismatches across providers | Lost transactions, customer loss |
| Unrecorded transactions | Invisible revenue leakage |
| Staff theft and manipulation | High trust cost |
| Fake SMS confirmations | Fraud exposure |
| No branch visibility for multi-shop owners | Operational blindness |
| No clean end-of-day reconciliation | Hours wasted, errors propagated |
| No profitability tracking by service | Cannot optimize float allocation |

WakalaSmart solves all of these — out of the box.

---

## MVP Features

### ✅ Authentication & Sessions
Email/password login via Better Auth. 7-day sessions with secure cookie management. Protected routes via `withAuth` middleware.

### ✅ Organization Onboarding
New owner signup triggers a guided onboarding wizard. Sets up the organization slug, display name, and default branch. Super-admin tenant management via `/admin`.

### ✅ Multi-Branch Management
Create and manage multiple branches. Per-branch till assignment. Branch-scoped reporting and reconciliation.

### ✅ Users & Staff (RBAC)
Invite staff by email. Four roles with enforced permissions:
- **Owner** — full access
- **Manager** — branch operations, approvals
- **Cashier** — transaction entry, shift management
- **Accountant** — read-only reports and audit trail

### ✅ Providers
Configure M-Pesa, Airtel Money, Tigo Pesa, HaloPesa (and custom providers). Per-provider float thresholds for low-float alerts.

### ✅ Tills
Two till types: `CASH_BOX` (physical cash) and `FLOAT_ACCOUNT` (per-provider float balance). Multiple tills per branch. Till assignment per shift.

### ✅ Transactions (15 Types)
Full CRUD for all 15 transaction types with dual-ledger impact:

| Type | Cash | Float |
|------|------|-------|
| DEPOSIT | + | + |
| WITHDRAWAL | − | − |
| FLOAT_PURCHASE | − | + |
| FLOAT_SALE | + | − |
| COMMISSION_RECEIPT | + | 0 |
| REVERSAL | ± | ± |
| EXPENSE | − | 0 |
| ... and 8 more | | |

Duplicate reference detection, soft-delete void with reversal entries.

### ✅ Cash Ledger (Immutable)
All cash balances derived from `CashLedgerEntry` records. No mutable balance columns. Prevents race conditions. Running balance computed from append-only ledger.

### ✅ Float Ledger (Immutable)
Per-provider `FloatLedgerEntry` records. Same append-only architecture as cash ledger. Float balance per till, per provider, at any point in time.

### ✅ Expense Tracking
Categorized expense recording (rent, utilities, airtime, etc.). Branch-scoped. Cash ledger impact. Exportable in reports.

### ✅ Shift Open / Close
Shift opening captures per-till opening balances. All transactions scoped to open shift. Shift close generates summary with closing balances. Prevents transactions outside of active shift.

### ✅ Daily Reconciliation Wizard
Step-by-step reconciliation flow:
1. System computes expected closing balance
2. Cashier submits actual physical count
3. Manager/Owner reviews and approves or rejects with notes
4. Role separation enforced: submitter ≠ approver
5. Immutable record once approved

### ✅ Dashboard (Owner + Cashier Views)
**Owner view:** Total cash, float per provider, 7-day transaction trends, branch performance summary, active alerts.

**Cashier view:** Current shift status, till balances, today's transaction count, recent activity.

### ✅ Reports (8 Types)
- Daily transaction summary
- Float movement by provider
- Commission income
- Expense breakdown
- Shift performance
- Staff activity
- Branch comparison
- Profit & loss

All reports include bar/pie charts (Recharts) and CSV export.

### ✅ Alert Engine (7 Alert Types)
Real-time alerts for: low float, low cash, large transaction, failed reconciliation, shift not closed, unusual activity, system events. Configurable thresholds per provider/branch.

### ✅ Audit Log (Immutable)
Every mutation creates an `AuditLog` entry: who, what, when, before/after state. Read-only API. Accountant access. 7-year retention policy.

### ✅ Settings
Organization profile, alert thresholds, security settings, provider configuration. Owner-only write access.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict) |
| Database | PostgreSQL 16 |
| ORM | Prisma 7 |
| Auth | Better Auth |
| API | Next.js Route Handlers (REST) |
| State | TanStack Query v5 |
| UI | Tailwind CSS v4 + shadcn/ui |
| Charts | Recharts |
| Containerization | Docker Compose |
| Package Manager | npm |

---

## Project Structure

```
wakalasmart/
├── src/
│   ├── app/
│   │   ├── (auth)/          # Login, register, onboarding
│   │   ├── (dashboard)/     # All authenticated pages
│   │   │   ├── dashboard/
│   │   │   ├── transactions/
│   │   │   ├── branches/
│   │   │   ├── tills/
│   │   │   ├── providers/
│   │   │   ├── staff/
│   │   │   ├── shifts/
│   │   │   ├── reconciliation/
│   │   │   ├── expenses/
│   │   │   ├── reports/
│   │   │   ├── alerts/
│   │   │   ├── audit-logs/
│   │   │   └── settings/
│   │   └── api/
│   │       └── v1/          # All REST API routes
│   ├── client/              # Client-side UI and auth client
│   │   ├── components/
│   │   └── lib/
│   ├── server/              # Server-side auth, db, services, validations
│   │   ├── lib/
│   │   ├── services/
│   │   └── validations/
│   ├── shared/              # Shared app types
│   └── lib/                 # Shared utilities
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── ROADMAP.md
│   ├── SPRINT_ROADMAP.md
│   └── TEST_ACCOUNTS.md
└── docker-compose.yml
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/your-org/wakalasmart.git
cd wakalasmart

# 2. Install dependencies
npm install

# 3. Start PostgreSQL via Docker
docker compose up -d

# 4. Configure environment
cp .env.example .env.local
# Edit .env.local with your values

# 5. Run database migrations
npx prisma migrate dev

# 6. Seed demo data
npx prisma db seed

# 7. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Demo credentials (seeded):**

- Owner: `amina@aminawakala.co.tz` / `Demo@1234`
- Branch Manager: `juma@aminawakala.co.tz` / `Demo@1234`
- Cashier: `fatuma@aminawakala.co.tz` / `Demo@1234`
- Cashier: `said@aminawakala.co.tz` / `Demo@1234`

See [`docs/TEST_ACCOUNTS.md`](docs/TEST_ACCOUNTS.md) for role details, branch access, and recommended smoke tests.

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/wakalasmart

# Better Auth
BETTER_AUTH_SECRET=<64-char random string>
BETTER_AUTH_URL=http://localhost:3000

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## API Reference

All API routes are under `/api/v1/` and require authentication.

| Endpoint | Methods | Auth |
|----------|---------|------|
| `/api/v1/transactions` | GET, POST | All roles |
| `/api/v1/transactions/[id]` | GET, DELETE | All roles |
| `/api/v1/branches` | GET, POST | Owner |
| `/api/v1/tills` | GET, POST | Owner/Manager |
| `/api/v1/providers` | GET, POST | Owner |
| `/api/v1/staff` | GET, POST | Owner/Manager |
| `/api/v1/shifts` | GET, POST | All roles |
| `/api/v1/reconciliation` | GET, POST | All roles |
| `/api/v1/reconciliation/[id]` | GET, PATCH | All roles |
| `/api/v1/dashboard` | GET | All roles |
| `/api/v1/reports` | GET | Owner/Accountant |
| `/api/v1/alerts` | GET | All roles |
| `/api/v1/alerts/[id]` | POST | All roles |
| `/api/v1/expenses` | GET, POST | All roles |
| `/api/v1/audit` | GET | Owner/Manager/Accountant |
| `/api/v1/org` | GET, PUT | Owner |
| `/api/v1/onboarding` | POST | Owner (no org) |

---

## Architecture Decisions

**Why append-only ledgers?**
All cash and float balances are computed from `CashLedgerEntry` / `FloatLedgerEntry` records. No mutable balance columns. This prevents race conditions in concurrent transaction environments, provides a complete audit trail, and allows balance reconstruction at any point in time.

**Why no balance columns on tills?**
Derived state is always consistent. A balance column can drift out of sync. A ledger cannot lie.

**Why Better Auth over NextAuth?**
Better Auth provides session management, CSRF protection, and email verification built-in with less configuration overhead for this use case.

**Why Prisma 7?**
Prisma 7 includes significant performance improvements and the new `prisma.config.ts` configuration format used in this project.

---

## Roadmap

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the full development roadmap, [`docs/SPRINT_ROADMAP.md`](docs/SPRINT_ROADMAP.md) for sprint-by-sprint implementation details, and [`docs/TEST_ACCOUNTS.md`](docs/TEST_ACCOUNTS.md) for seeded test users.

**Upcoming (Post-MVP):**
- Mobile app (React Native / Expo) — cashier-focused POS
- SMS notifications via Africa's Talking
- WhatsApp daily summary reports
- Thermal receipt printing
- Bulk CSV import for opening balances
- Multi-currency (USD, KES alongside TZS)

---

## Contributing

1. Branch from `develop`: `git checkout -b feature/your-feature`
2. Follow the Definition of Done in [`docs/ROADMAP.md`](docs/ROADMAP.md)
3. TypeScript must compile with zero errors: `npx tsc --noEmit`
4. Open a PR targeting `develop`

---

## License

Proprietary. All rights reserved. © 2026 WakalaSmart.
