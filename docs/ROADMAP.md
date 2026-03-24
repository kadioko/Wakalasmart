# WakalaSmart Build Roadmap

## Overview

WakalaSmart is built as a production-grade SaaS platform for Tanzanian mobile money agents (wakalas). This roadmap covers the development phases from MVP to full production deployment.

For the current execution plan and a more detailed assessment of what is still left to build, see [`docs/SPRINT_ROADMAP.md`](./SPRINT_ROADMAP.md). This document remains a higher-level phase roadmap.

Status note: the repository already contains substantial implementation work for the early phases, but the detailed sprint roadmap should be treated as the source of truth for what is still incomplete.

---

## Phase 1 — Foundation (Weeks 1–2) — foundational assets implemented

**Goal:** Project setup, schema, and core authentication working

| Task | Status |
|------|--------|
| Product requirements document | ✅ |
| System architecture design | ✅ |
| PostgreSQL schema (Prisma v7) | ✅ |
| Better Auth integration | ✅ |
| Multi-tenant middleware (`withAuth`) | ✅ |
| Docker Compose local dev environment | ✅ |
| Database seed with demo data | ✅ |

**Deliverables:**
- `docs/PRD.md`
- `docs/ARCHITECTURE.md`
- `prisma/schema.prisma`
- `src/lib/auth.ts`, `src/lib/db.ts`
- `prisma/seed.ts` (demo: Amina Wakala Services)

---

## Phase 2 — Core Backend Services (Weeks 3–4) — largely implemented, still needs hardening

**Goal:** All business logic services complete with ledger architecture

| Task | Status |
|------|--------|
| Ledger-based balance service | ✅ |
| Transaction service (15 types, dual-ledger) | ✅ |
| Reconciliation service (with role separation) | ✅ |
| Dashboard service (owner + cashier views) | ✅ |
| Alert service (float/cash threshold monitoring) | ✅ |
| Audit log service (immutable) | ✅ |

**Key architectural decisions:**
- All balances derived from `CashLedgerEntry` / `FloatLedgerEntry` tables
- No mutable balance columns — prevents race conditions
- Every financial action creates an `AuditLog` entry
- Soft deletes for all financial records

---

## Phase 3 — API Layer (Weeks 4–5) — route surface exists, authorization and edge cases still need completion

**Goal:** Full REST API with auth, RBAC, and tenant isolation

| Endpoint | Method | Auth |
|----------|--------|------|
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

## Phase 4 — Frontend (Weeks 6–8) — screens exist, several workflows are still partial

**Goal:** Full dashboard UI with all CRUD operations

| Page | URL | Description |
|------|-----|-------------|
| Login | `/login` | Email/password auth |
| Register | `/register` | Sign up + auto-onboarding |
| Onboarding | `/onboarding` | Business setup wizard |
| Dashboard | `/dashboard` | Stats, float balances, trends |
| Transactions | `/transactions` | List, filter, new transaction |
| Branches | `/branches` | Multi-branch management |
| Tills | `/tills` | Cash box + float accounts |
| Providers | `/providers` | M-Pesa, Airtel, Tigo, HaloPesa |
| Staff | `/staff` | Team management, invite |
| Shifts | `/shifts` | Shift open/close with balances |
| Reconciliation | `/reconciliation` | Daily reconciliation wizard |
| Expenses | `/expenses` | Expense tracking |
| Reports | `/reports` | Analytics, charts, CSV export |
| Alerts | `/alerts` | System alerts, notifications |
| Audit Logs | `/audit-logs` | Immutable activity log |
| Settings | `/settings` | Org settings, thresholds |

---

## Phase 5 — Testing (Weeks 9–10)

**Goal:** Unit tests for core services, integration tests for API routes

### Priority Test Cases

**Balance Service**
- [ ] `appendCashLedgerEntry` creates correct running balance
- [ ] `appendFloatLedgerEntry` creates correct running balance
- [ ] Concurrent entries handled correctly (db transaction isolation)
- [ ] Zero/negative balance detection

**Transaction Service**
- [ ] All 15 transaction types create correct ledger entries
- [ ] `FLOAT_PURCHASE` increases float, decreases cash
- [ ] `DEPOSIT` increases cash, increases float
- [ ] `WITHDRAWAL` decreases cash, decreases float
- [ ] Duplicate reference detection
- [ ] Void creates reversal entries

**Reconciliation Service**
- [ ] Opening balance computed correctly
- [ ] Variance calculated (actual vs expected)
- [ ] Role separation enforced (submitter ≠ approver)
- [ ] Cannot approve already-approved reconciliation

**Auth / RBAC**
- [ ] Cashier cannot access OWNER-only routes
- [ ] Tenant isolation: User A cannot see User B's data
- [ ] Expired sessions return 401

**Suggested Testing Stack:**
```bash
npm install -D vitest @vitejs/plugin-react
npm install -D @testing-library/react @testing-library/user-event
```

---

## Phase 6 — Production Hardening (Weeks 11–12)

### Security
- [ ] Enable email verification (`requireEmailVerification: true`)
- [ ] Configure SMTP (Resend / SendGrid)
- [ ] Add rate limiting (middleware or Upstash Redis)
- [ ] Enable CSRF protection (Better Auth built-in)
- [ ] Add CSP headers (`next.config.ts`)
- [ ] API request signing for webhooks

### Performance
- [ ] Enable Prisma query caching (Prisma Accelerate or Redis)
- [ ] Add `Cache-Control` headers for dashboard stats
- [ ] Image optimization (Next.js Image with CDN)
- [ ] Bundle analysis: `npx @next/bundle-analyzer`

### Observability
- [ ] Add Sentry error tracking
- [ ] Add structured logging (pino / winston)
- [ ] Set up Prometheus metrics for transaction throughput
- [ ] Database slow query monitoring

### Compliance
- [ ] Encrypt PII fields (customerPhone) at rest
- [ ] Add data retention policy (auto-archive audit logs after 7 years)
- [ ] Backup automation (pg_dump to S3 daily)

---

## Phase 7 — Deployment (Week 13)

### Recommended Stack

| Component | Service |
|-----------|---------|
| App hosting | Railway (auto-deploy from Git) |
| Database | Neon PostgreSQL (serverless, branching) |
| File storage | Cloudflare R2 |
| Email | Resend |
| Monitoring | Sentry + Uptime Robot |
| CDN | Cloudflare |

### Environment Variables for Production

```env
DATABASE_URL=postgresql://...neon.tech/wakalasmart
BETTER_AUTH_SECRET=<64-char random string>
BETTER_AUTH_URL=https://app.wakalasmart.co.tz
NEXT_PUBLIC_APP_URL=https://app.wakalasmart.co.tz
SMTP_HOST=smtp.resend.com
SMTP_USER=resend
SMTP_PASS=re_...
NODE_ENV=production
```

### Deploy Commands

```bash
# Build
npm run build

# Migrate production DB
DATABASE_URL=<prod_url> npx prisma migrate deploy

# Start
npm start
```

---

## Phase 8 — Post-Launch Features (Months 2–4)

### Tier 1 (High Impact)
- [ ] **Mobile App** (React Native / Expo) — cashier-focused POS interface
- [ ] **SMS notifications** (Africa's Talking) — shift close alerts, low float warnings
- [ ] **Receipt printing** — thermal printer support via browser print API
- [ ] **Bulk transaction import** (CSV upload for opening balances)
- [ ] **Multi-currency** — USD, KES alongside TZS

### Tier 2 (Growth)
- [ ] **WhatsApp integration** — daily summary reports to owner
- [ ] **Agent banking** — NMB / CRDB bank integration
- [ ] **Loan tracking** — short-term agent credit for float
- [ ] **Staff payroll** — commission-based payslip generation
- [ ] **Tax reporting** — TRA-compliant monthly/annual summaries

### Tier 3 (Platform)
- [ ] **Marketplace** — wakala directory for customers
- [ ] **Network analytics** — aggregated provider performance data
- [ ] **Franchise module** — head office + multiple franchisee organizations
- [ ] **Open API** — third-party integrations (accounting, ERP)

---

## Sprint Velocity Reference

| Sprint | Duration | Capacity |
|--------|----------|----------|
| 1 week | 5 days | ~40 story points |
| Story point 1 | Simple config change | < 30 min |
| Story point 2 | New API endpoint | 1–2 hours |
| Story point 5 | New page with CRUD | 4–8 hours |
| Story point 8 | Complex feature (recon, ledger) | 1–2 days |

---

## Definition of Done

A feature is **done** when:
1. ✅ TypeScript compiles with zero errors
2. ✅ All API routes return correct status codes (2xx/4xx/5xx)
3. ✅ Role-based access enforced (unauthorized → 403)
4. ✅ Tenant isolation enforced (cross-org → 404)
5. ✅ Audit log entry created for all mutations
6. ✅ UI handles loading states, empty states, and errors
7. ✅ No sensitive data in client-side responses
