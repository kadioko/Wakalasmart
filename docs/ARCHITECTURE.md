# WakalaSmart — System Architecture
**Version:** 1.0

---

## 1. Final Stack Decision

### Frontend
| Technology | Choice | Justification |
|---|---|---|
| Framework | Next.js 15 (App Router) | SSR/SSG for fast loads, API routes, single deployment unit, best React DX |
| Language | TypeScript (strict) | Type safety critical for financial calculations |
| Styling | Tailwind CSS | Utility-first, mobile-first, fast iteration |
| Components | shadcn/ui | Accessible, unstyled-first, composable, not locked-in |
| Forms | React Hook Form + Zod | Performant, strongly typed form validation |
| Data Fetching | TanStack Query v5 | Cache management, background refetch, optimistic updates |
| Tables | TanStack Table v8 | Headless, performant, works with shadcn |
| Charts | Recharts | Small bundle, composable, works well with Tailwind |
| State | Zustand (minimal) | Only for UI state (modals, filters); server state via TanStack Query |

### Backend
| Technology | Choice | Justification |
|---|---|---|
| Runtime | Node.js via Next.js API routes | Single codebase, shared types, no second deployment |
| Validation | Zod | Schema-first, shared between client/server |
| ORM | Prisma | Type-safe queries, excellent migration tooling, PostgreSQL native |
| Auth | Better Auth | Multi-tenant aware, RBAC support, session-based, open source |

### Database
| Technology | Choice | Justification |
|---|---|---|
| Primary DB | PostgreSQL 16 | ACID compliant, critical for financial data, row-level security |
| Connection | Prisma + connection pooling (PgBouncer via Neon/Supabase) | Serverless-compatible |
| Caching | In-process + DB materialized views for summary aggregates | No Redis in MVP; add later if needed |

### Infrastructure
| Layer | Choice |
|---|---|
| Local Dev | Docker Compose (PostgreSQL + App) |
| Hosting | Railway (simple, cheap, PostgreSQL native) or Render |
| DB Hosting | Neon (serverless PostgreSQL) or Railway managed Postgres |
| File Storage | Local in dev; S3-compatible (Cloudflare R2) in prod for future attachments |
| CI/CD | GitHub Actions |
| Monitoring | Sentry (errors) + Vercel/Railway built-in metrics |

---

## 2. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
│                                                                   │
│   Next.js App (React)                                            │
│   ├── Auth Pages (Login/Register/Onboarding)                     │
│   ├── Dashboard (Owner/Manager/Cashier views)                    │
│   ├── Transaction Module                                          │
│   ├── Reconciliation Wizard                                       │
│   ├── Reports Module                                              │
│   └── Super Admin Portal                                          │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Next.js API Routes (Node.js)                   │
│                                                                   │
│   /api/auth/*          — Better Auth handlers                    │
│   /api/v1/transactions/*  — Transaction CRUD + ledger            │
│   /api/v1/branches/*      — Branch management                    │
│   /api/v1/tills/*         — Till management                      │
│   /api/v1/providers/*     — Provider management                  │
│   /api/v1/staff/*         — User management                      │
│   /api/v1/shifts/*        — Shift open/close                     │
│   /api/v1/reconciliation/* — Reconciliation engine              │
│   /api/v1/expenses/*      — Expense tracking                     │
│   /api/v1/reports/*       — Report generation                    │
│   /api/v1/alerts/*        — Alert management                     │
│   /api/v1/audit/*         — Audit log access                     │
│   /api/v1/dashboard/*     — Dashboard aggregates                 │
│   /api/v1/admin/*         — Super admin operations               │
│                                                                   │
│   Middleware Layer:                                               │
│   ├── Auth verification (session check)                          │
│   ├── Tenant isolation (org_id injection)                        │
│   ├── Role authorization (RBAC check)                            │
│   ├── Rate limiting                                               │
│   └── Request validation (Zod)                                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Service    │  │   Service    │  │   Service    │
│   Layer      │  │   Layer      │  │   Layer      │
│              │  │              │  │              │
│ Transaction  │  │Reconciliation│  │   Balance    │
│ Service      │  │ Service      │  │   Service    │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                  │
       └─────────────────┼──────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Data Access Layer (Prisma)                     │
│                                                                   │
│   Repositories: transaction, branch, till, provider, shift,      │
│   reconciliation, expense, ledger, audit, user, alert            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                            │
│                                                                   │
│   Single-schema multi-tenant (org_id on every table)             │
│   ├── Row-level security via application layer                   │
│   ├── Immutable audit_logs table                                 │
│   ├── Ledger-based balance architecture                          │
│   └── Indexed for time-series queries                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Module Boundaries

```
┌─────────────────────────────────────────────────────┐
│                    MODULE MAP                         │
│                                                       │
│  auth/          — Session, user identity, invites    │
│  orgs/          — Organization + settings            │
│  branches/      — Branch CRUD + assignment           │
│  users/         — Staff management + roles           │
│  providers/     — Network provider config            │
│  tills/         — Till/account management            │
│  transactions/  — Core transaction engine            │
│  ledger/        — Cash + float ledger entries        │
│  shifts/        — Shift open/close lifecycle         │
│  reconciliation/— Daily reconciliation engine        │
│  expenses/      — Expense tracking                   │
│  reports/       — Report aggregation + export        │
│  alerts/        — Alert rules + notification         │
│  audit/         — Immutable audit trail              │
│  dashboard/     — Aggregated dashboard data          │
│  admin/         — Platform super admin               │
└─────────────────────────────────────────────────────┘
```

---

## 4. Authorization Model

### Role Hierarchy

```
super_admin (platform level)
    └── owner (per organization)
            ├── branch_manager (per branch)
            ├── cashier (per branch/till)
            └── accountant (per organization, read-mostly)
```

### Permission Matrix

| Action | super_admin | owner | branch_manager | cashier | accountant |
|---|---|---|---|---|---|
| View all orgs | ✓ | — | — | — | — |
| Manage org settings | — | ✓ | — | — | — |
| Create branch | — | ✓ | — | — | — |
| Invite staff | — | ✓ | ✓ (branch) | — | — |
| Record transaction | — | ✓ | ✓ | ✓ | — |
| Approve adjustment | — | ✓ | ✓ | — | — |
| View all branches | — | ✓ | own | own | ✓ |
| Submit reconciliation | — | ✓ | ✓ | ✓ | — |
| Approve reconciliation | — | ✓ | ✓ | — | ✓ (review) |
| View reports | — | ✓ | branch | own shift | ✓ |
| Export data | — | ✓ | ✓ | — | ✓ |
| View audit logs | — | ✓ | branch | — | ✓ |
| Manage providers | — | ✓ | — | — | — |
| Manage tills | — | ✓ | ✓ | — | — |
| View dashboard | ✓ (platform) | ✓ | ✓ | limited | ✓ |
| Configure alerts | — | ✓ | ✓ (branch) | — | — |

### Tenant Isolation Model

Every database query is scoped to `organization_id`. The application middleware:
1. Verifies session on every API request
2. Extracts `organization_id` from the authenticated user's session
3. Injects `organization_id` into every database query automatically
4. Branch managers have an additional `allowed_branch_ids` scope
5. Cashiers have `branch_id` + `till_id` scope

**No cross-tenant data access is possible at the application layer.**

---

## 5. API Structure

All API routes follow REST conventions with JSON responses.

```
Base: /api/v1/

Auth:
  POST   /api/auth/sign-in
  POST   /api/auth/sign-up
  POST   /api/auth/sign-out
  POST   /api/auth/forgot-password
  POST   /api/auth/reset-password

Organizations:
  GET    /api/v1/org                     — Get current org
  PUT    /api/v1/org                     — Update org settings
  GET    /api/v1/org/settings            — Get settings

Branches:
  GET    /api/v1/branches
  POST   /api/v1/branches
  GET    /api/v1/branches/:id
  PUT    /api/v1/branches/:id
  DELETE /api/v1/branches/:id (soft)

Staff/Users:
  GET    /api/v1/staff
  POST   /api/v1/staff/invite
  GET    /api/v1/staff/:id
  PUT    /api/v1/staff/:id
  DELETE /api/v1/staff/:id (deactivate)
  PUT    /api/v1/staff/:id/roles
  POST   /api/v1/staff/:id/branches

Providers:
  GET    /api/v1/providers
  POST   /api/v1/providers
  PUT    /api/v1/providers/:id
  DELETE /api/v1/providers/:id

Tills:
  GET    /api/v1/tills
  POST   /api/v1/tills
  GET    /api/v1/tills/:id
  PUT    /api/v1/tills/:id
  GET    /api/v1/tills/:id/balance        — Derived balance

Transactions:
  GET    /api/v1/transactions
  POST   /api/v1/transactions
  GET    /api/v1/transactions/:id
  POST   /api/v1/transactions/:id/void   — Creates reversal record
  POST   /api/v1/transactions/:id/approve

Shifts:
  GET    /api/v1/shifts
  POST   /api/v1/shifts/open
  POST   /api/v1/shifts/:id/close
  GET    /api/v1/shifts/:id
  GET    /api/v1/shifts/active            — Current open shift for user

Reconciliation:
  GET    /api/v1/reconciliation
  POST   /api/v1/reconciliation
  GET    /api/v1/reconciliation/:id
  POST   /api/v1/reconciliation/:id/submit
  POST   /api/v1/reconciliation/:id/approve
  POST   /api/v1/reconciliation/:id/reject

Expenses:
  GET    /api/v1/expenses
  POST   /api/v1/expenses
  GET    /api/v1/expenses/:id
  PUT    /api/v1/expenses/:id
  DELETE /api/v1/expenses/:id (soft)

Reports:
  GET    /api/v1/reports/daily-summary
  GET    /api/v1/reports/provider-performance
  GET    /api/v1/reports/cash-movement
  GET    /api/v1/reports/float-movement
  GET    /api/v1/reports/staff-performance
  GET    /api/v1/reports/branch-performance
  GET    /api/v1/reports/expenses
  GET    /api/v1/reports/variance
  GET    /api/v1/reports/commission
  GET    /api/v1/reports/profit
  GET    /api/v1/reports/reconciliation-history
  GET    /api/v1/reports/export/:type    — CSV export

Alerts:
  GET    /api/v1/alerts
  PUT    /api/v1/alerts/:id/read
  GET    /api/v1/alerts/settings
  PUT    /api/v1/alerts/settings

Dashboard:
  GET    /api/v1/dashboard/owner
  GET    /api/v1/dashboard/manager
  GET    /api/v1/dashboard/cashier

Audit:
  GET    /api/v1/audit-logs

Admin (super_admin only):
  GET    /api/v1/admin/organizations
  GET    /api/v1/admin/organizations/:id
  PUT    /api/v1/admin/organizations/:id/suspend
  GET    /api/v1/admin/stats
```

---

## 6. Multi-Tenant Model

**Strategy:** Shared schema, tenant-isolated via `organization_id` column on every table.

**Rationale:**
- Simpler ops for MVP (one database, one schema)
- Cost-effective for 100 orgs
- Easier to query across tenants for platform analytics
- Migration to schema-per-tenant or DB-per-tenant possible later if needed

**Enforcement:**
- Every Prisma query includes `where: { organizationId: session.organizationId }`
- Middleware sets `ctx.organizationId` on every request
- Repository functions require `organizationId` as first argument
- Automated tests verify cross-tenant isolation

---

## 7. Deployment Architecture

```
Production:

┌────────────────────┐    ┌────────────────────┐
│   Railway App      │    │   Neon PostgreSQL   │
│   (Next.js)        │◄──►│   (Primary DB)      │
│   2x instances     │    │   Serverless        │
│   Auto-scale       │    │   Connection pool   │
└────────────────────┘    └────────────────────┘
         │
         ▼
┌────────────────────┐
│  Cloudflare R2     │
│  (File storage)    │
│  (Future)          │
└────────────────────┘

Local Dev:

docker-compose:
  - postgres:16
  - app (Next.js dev server)
```

**Environment variables:**
- `DATABASE_URL` — PostgreSQL connection string
- `BETTER_AUTH_SECRET` — Auth secret
- `BETTER_AUTH_URL` — App URL
- `SMTP_*` — Email for invitations/password reset
- `NEXT_PUBLIC_APP_URL` — Public app URL
- `NODE_ENV` — environment

---

## 8. Key Architectural Decisions

### ADR-001: Ledger-Based Balances
**Decision:** All balances derived from immutable ledger entries, not mutable balance columns.
**Rationale:** Financial integrity, auditability, no update races.
**Trade-off:** Slightly slower balance reads; mitigated with daily summary caches.

### ADR-002: Shared Schema Multi-Tenancy
**Decision:** Single DB, `organization_id` on every table.
**Rationale:** MVP simplicity, lower ops cost, easy cross-tenant analytics.
**Trade-off:** Larger tables; mitigated with proper indexing.

### ADR-003: Better Auth for Authentication
**Decision:** Better Auth over Clerk/Supabase Auth.
**Rationale:** Open source, self-hosted, full control, multi-tenant RBAC, no per-user pricing.
**Trade-off:** More setup than Clerk; worth it for financial SaaS with custom roles.

### ADR-004: Next.js Full-Stack
**Decision:** Next.js API routes instead of separate backend.
**Rationale:** Single deployment, shared TypeScript types, faster MVP iteration.
**Trade-off:** Harder to independently scale API vs frontend at high load; acceptable for MVP.

### ADR-005: Soft Deletes on Financial Records
**Decision:** No hard deletes on transactions, reconciliations, ledger entries.
**Rationale:** Regulatory compliance, audit trail integrity, loss prevention.
**Trade-off:** Slightly larger DB; managed with archival strategy post-MVP.
