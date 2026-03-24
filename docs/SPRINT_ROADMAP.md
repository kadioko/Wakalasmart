# WakalaSmart Sprint Implementation Roadmap

## Purpose

This document translates the product and architecture docs into an execution-focused implementation roadmap based on the current repository state.

It is intended to answer two questions:

1. What already exists in the project?
2. What is still left to build to reach a production-ready MVP?

---

## Current State Assessment

### What already exists

The repository already contains substantial foundational work:

- Next.js app structure with auth and dashboard route groups
- Prisma schema for multi-tenant organizations, branches, users, tills, providers, transactions, ledgers, shifts, reconciliations, expenses, alerts, and audit logs
- Better Auth integration and authenticated API helper patterns
- REST endpoints for most MVP resources under `src/app/api/v1`
- Service-layer files for balance, transaction, reconciliation, dashboard, alert, and audit logic
- UI pages for major dashboard modules
- Product, architecture, and financial engine documentation

### What is still left or incomplete

The codebase is promising, but it is **not yet feature-complete** relative to the current docs.

#### Documentation gaps

- `README.md` references `docs/SPRINT_ROADMAP.md`, but that file did not exist before this document
- `docs/ROADMAP.md` marks several phases as complete even though important implementation gaps remain
- Docs mention Next.js 15, while `package.json` is currently on Next.js 16.2.1

#### Product and implementation gaps found in the codebase

- Staff invitation email sending is still a TODO in `src/app/api/v1/staff/route.ts`
- No visible password reset flow yet
- No visible invitation acceptance flow yet
- No visible super-admin UI or `/admin` area yet
- No automated tests were found in the repository
- Transaction approval and reversal workflows are only partially implemented
- Transaction voiding does not yet appear to create reversal ledger entries
- Some transaction behavior is simplified or inconsistent with the financial engine doc
- Cashier branch scoping is noted but incomplete in the transactions API
- Reconciliation logic contains simplified provider breakdown values
- CRUD coverage is incomplete for some modules, especially update/archive/admin actions
- Production hardening items such as rate limiting, monitoring, email verification, backups, and CI are still outstanding

### Recommended delivery strategy

Treat the current codebase as a **strong MVP scaffold with partial business implementation**, not as a finished MVP. The safest path is to complete the work in the sprint order below and use each sprint to close both functional gaps and quality gaps.

---

## Sprint 0: Setup and Architecture

### Sprint 0 Goals

- Stabilize the project baseline and align docs with actual implementation
- Confirm authoritative architecture decisions for Next.js, auth, validation, and financial consistency
- Establish delivery standards, environments, and team workflow before feature expansion

### Sprint 0 Specific Tasks

- [ ] Audit all existing docs and update status claims that overstate completion
- [ ] Confirm compatibility with the installed Next.js version and review relevant Next.js local docs before major app changes
- [ ] Define project conventions for route handlers, server/client boundaries, validation, services, and error handling
- [ ] Add environment templates for local, staging, and production configuration
- [ ] Add shared API response/error contracts and document them
- [ ] Add lint/typecheck/build scripts for CI readiness
- [ ] Add a minimal CI pipeline for install, lint, typecheck, and build
- [ ] Decide how background jobs will run for alerts, stale shifts, and overdue reconciliation checks
- [ ] Define tenant isolation invariants and RBAC rules as an explicit engineering contract
- [ ] Review schema/index coverage for expected reporting and ledger access patterns
- [ ] Create a canonical module readiness checklist for each sprint

### Sprint 0 Dependencies

- Existing Prisma schema
- Existing auth setup
- Existing docs in `docs/`

### Sprint 0 Risks

- Architectural drift between docs and code creates rework later
- Next.js version differences may break implementation assumptions
- Missing operational conventions can lead to inconsistent APIs and duplicated logic

### Sprint 0 Definition of Done

- Documentation reflects actual repository state
- CI runs lint, typecheck, and build successfully
- Core architectural decisions are documented and accepted
- Environment variables and deployment assumptions are clearly documented
- Sprint sequencing and technical ownership are clear

---

## Sprint 1: Auth, Tenant Model, Branches, Users

### Sprint 1 Goals

- Complete the user lifecycle and tenant boundaries
- Make organization onboarding, branch management, and staff management production-usable
- Close RBAC and tenant isolation gaps across all auth-protected routes

### Sprint 1 Specific Tasks

- [ ] Complete register, login, logout, and session validation flows
- [ ] Implement password reset flow and email templates
- [ ] Implement email verification flow if required for launch
- [ ] Complete onboarding flow for organization creation and first branch setup
- [ ] Implement invitation acceptance flow for staff onboarding
- [ ] Implement invitation resend/revoke/expire handling
- [ ] Wire invitation email delivery in the staff API
- [ ] Add branch update, activation/inactivation, and manager assignment flows
- [ ] Add user profile update, deactivation/reactivation, and branch assignment management
- [ ] Enforce branch-level access for cashier and manager roles consistently across all endpoints
- [ ] Add route-level and service-level permission tests for OWNER, BRANCH_MANAGER, CASHIER, and ACCOUNTANT
- [ ] Add platform-level guardrails for users with no organization or suspended organizations
- [ ] Define or implement super-admin access model, even if only as internal API support initially

### Sprint 1 Dependencies

- Sprint 0 environment and architecture decisions
- Working auth provider configuration
- Stable tenant and RBAC rules

### Sprint 1 Risks

- Cross-tenant data leakage if access rules are inconsistently enforced
- Broken invitation flow can block staff onboarding entirely
- Partial RBAC enforcement can create hidden security issues

### Sprint 1 Definition of Done

- Owners can register, onboard an organization, and create a first branch
- Staff can be invited and successfully join through an invitation flow
- Branches and users can be managed without direct database edits
- All authenticated routes enforce tenant isolation and role checks consistently
- Auth edge cases return correct 401/403/404 behavior

---

## Sprint 2: Providers, Tills, Transactions

### Sprint 2 Goals

- Make day-to-day operational data entry reliable for real business use
- Complete the operational setup model for providers and tills
- Make transaction capture accurate, validated, and role-safe

### Sprint 2 Specific Tasks

- [ ] Add provider update, activation/inactivation, and threshold editing
- [ ] Add till update, activation/inactivation, and till-provider consistency rules
- [ ] Enforce default till creation rules per branch and provider where needed
- [ ] Validate provider/till compatibility on transaction creation
- [ ] Complete transaction validation for all supported transaction types
- [ ] Implement missing transaction-specific requirements such as references, notes, and role restrictions
- [ ] Fix or verify ledger impact rules against `docs/FINANCIAL_ENGINE.md`
- [ ] Ensure fee and commission treatment is consistent for transfers and other applicable types
- [ ] Add transaction approval queue behavior for reversals and adjustments
- [ ] Add endpoints and UI states for pending, approved, rejected, and voided transactions
- [ ] Complete duplicate-reference handling modes (`WARN` vs `BLOCK`)
- [ ] Finish branch scoping for cashier transaction listing and creation
- [ ] Add transaction detail view improvements and operational filters

### Sprint 2 Dependencies

- Sprint 1 auth, tenant, and branch/user completion
- Stable provider and till schema behavior
- Confirmed financial rules from architecture review

### Sprint 2 Risks

- Incorrect transaction rules will corrupt downstream ledger and reporting results
- Incomplete till/provider validation can create invalid financial records
- Approval flows can become confusing without clean status modeling

### Sprint 2 Definition of Done

- Providers and tills can be created and maintained from the app
- All intended transaction types can be recorded with correct validations
- Cashiers can only act within assigned branches and permitted transaction types
- Pending/approved/voided transaction states work end-to-end
- Operational transaction entry is usable without manual back-office fixes

---

## Sprint 3: Ledger Engine and Balances

### Sprint 3 Goals

- Make the financial core trustworthy
- Ensure every transaction and reversal produces correct immutable ledger effects
- Establish confidence in balance correctness under normal and edge-case conditions

### Sprint 3 Specific Tasks

- [ ] Review and correct ledger impact mapping for every transaction type
- [ ] Implement true reversal behavior with compensating ledger entries instead of status-only voiding
- [ ] Implement or harden manual adjustment workflows with approval and audit requirements
- [ ] Ensure cash and float ledgers are always written atomically with the source transaction
- [ ] Review database transaction isolation strategy for race-condition safety
- [ ] Add insufficient-balance prevention for both cash and float paths
- [ ] Add point-in-time balance queries per till, provider, branch, and organization
- [ ] Add balance summary helpers used by dashboard, shifts, and reconciliation
- [ ] Add ledger integrity assertions for orphaned or inconsistent financial records
- [ ] Add unit tests for ledger append logic and transaction-to-ledger mapping
- [ ] Add concurrency-oriented test coverage for simultaneous writes where feasible
- [ ] Add operational backfill or repair tooling design for future migrations if needed

### Sprint 3 Dependencies

- Sprint 2 transaction rules must be stable
- Prisma schema and indexes must be finalized for MVP
- Clear treatment of reversals, adjustments, and approvals

### Sprint 3 Risks

- This is the highest-risk sprint because financial correctness is foundational
- Any ledger bug will cascade into dashboards, reports, reconciliation, and trust loss
- Concurrency issues may only appear under production load if not tested early

### Sprint 3 Definition of Done

- Every completed financial transaction produces the expected ledger entries
- Voids and reversals create correct compensating entries
- Balances are derivable accurately from ledger data only
- Negative balance protections are enforced correctly
- Ledger tests cover the main transaction and reversal scenarios

---

## Sprint 4: Shifts and Reconciliation

### Sprint 4 Goals

- Complete the operational daily-close workflow
- Make shifts, counts, approvals, and variances reliable for branch operations
- Turn reconciliation from a basic record into a full control process

### Sprint 4 Specific Tasks

- [ ] Finalize shift open flow with per-till opening balances
- [ ] Finalize shift close flow with counted balances and variance capture
- [ ] Prevent invalid overlap such as multiple conflicting open shifts per user or branch where not allowed
- [ ] Enforce transaction-on-open-shift rules consistently
- [ ] Improve reconciliation computation to use accurate provider-specific movement breakdowns
- [ ] Link reconciliation more tightly to shift lifecycle where shift-based reconciliation is enabled
- [ ] Add rejection/edit/resubmission flow for reconciliations
- [ ] Add variance note requirements for material discrepancies
- [ ] Add manager/owner approval UX and permission enforcement
- [ ] Implement stale shift and unreconciled-day alert triggers
- [ ] Add printable/exportable reconciliation summary for operations review
- [ ] Add test coverage for role separation and approval state transitions

### Sprint 4 Dependencies

- Sprint 3 ledger and balances must be trustworthy
- Sprint 1 RBAC must be complete
- Sprint 2 operational entities must be stable

### Sprint 4 Risks

- Reconciliation built on incorrect balances will create false confidence
- Poor UX in shift close can reduce adoption by cashiers and managers
- Ambiguous shift rules can create operational confusion across branches

### Sprint 4 Definition of Done

- Shifts can be opened, closed, reviewed, and approved cleanly
- Reconciliations compute expected versus actual balances correctly
- Role separation is enforced when enabled
- Variances, notes, and approvals are fully traceable
- Branch operations can complete end-of-day without off-system spreadsheets

---

## Sprint 5: Dashboard and Reports

### Sprint 5 Goals

- Deliver decision-ready visibility for owners, managers, and accountants
- Turn raw operational data into reliable summaries and reports
- Improve perceived product value through clear insight and performance visibility

### Sprint 5 Specific Tasks

- [ ] Finalize role-based dashboard views for owner, manager, cashier, and accountant
- [ ] Ensure dashboard cards use reliable service-layer aggregates, not duplicated page logic
- [ ] Review dashboard query performance and add caching or summary strategies where needed
- [ ] Complete all MVP reports promised in the PRD, prioritizing the highest-value six to eight reports
- [ ] Add filtering by date range, branch, provider, user, transaction type, and status
- [ ] Complete CSV export behavior for all report types in scope
- [ ] Add branch comparison and provider performance analytics
- [ ] Add expense and profitability views with explicit assumptions documented
- [ ] Add empty states, loading states, and error states for all reporting screens
- [ ] Validate report totals against ledger-derived numbers
- [ ] Add report correctness tests for a seeded demo dataset

### Sprint 5 Dependencies

- Sprint 3 and Sprint 4 financial outputs must be trusted
- Daily summaries or performant aggregation paths should be available

### Sprint 5 Risks

- Slow queries may make reporting unusable on production data volumes
- Inconsistent aggregation logic between dashboard and reports will erode trust
- Profitability metrics can be misleading if assumptions are not explicit

### Sprint 5 Definition of Done

- Each target role sees relevant dashboard information only
- Core reports are accessible, filterable, and exportable
- Report numbers reconcile with ledger-derived source data
- Dashboard performance is acceptable on realistic seed data
- Owners can use the app to monitor branch and provider performance daily

---

## Sprint 6: Alerts, Audit Logs, Settings

### Sprint 6 Goals

- Finish the control, oversight, and configuration layer of the product
- Make the system proactive for risk detection and transparent for investigations
- Allow organizations to tune operational rules safely

### Sprint 6 Specific Tasks

- [ ] Finalize alert generation logic for low cash, low float, large transactions, duplicate references, high reversals, stale shifts, and unreconciled days
- [ ] Decide whether alerts are event-driven, scheduled, or hybrid and implement accordingly
- [ ] Add alert read, dismiss, and bulk-management UX improvements
- [ ] Review audit log coverage to ensure all sensitive writes are captured
- [ ] Add missing audit log events for approvals, deactivations, settings changes, and admin actions
- [ ] Add search and filters for audit logs by actor, resource, action, date, and branch
- [ ] Expand settings UI for organization-level financial controls and operational preferences
- [ ] Add settings validation and change auditing
- [ ] Add suspension/inactive organization handling in settings/admin logic
- [ ] Add retention and archival policy documentation for alerts and audit logs

### Sprint 6 Dependencies

- Earlier sprints must already emit correct domain events or equivalent triggers
- Stable organization settings model
- Stable role and admin permissions

### Sprint 6 Risks

- Incomplete alerting reduces the platform's prevention value
- Missing audit events weaken accountability and forensic usefulness
- Unsafe settings changes can alter financial behavior unexpectedly

### Sprint 6 Definition of Done

- Key operational alerts trigger reliably under expected conditions
- Audit logs cover all important write and approval events
- Settings changes are validated, persisted, and audited
- Owners and managers can use alerts and logs to investigate operational issues
- Operational controls can be configured without developer intervention

---

## Sprint 7: Polish, Testing, Deployment

### Sprint 7 Goals

- Make the product launch-ready
- Raise confidence through automated testing and operational hardening
- Prepare the project for staging, deployment, and early customer onboarding

### Sprint 7 Specific Tasks

- [ ] Add a proper automated test stack and baseline coverage targets
- [ ] Add unit tests for balance, transaction, reconciliation, alert, and audit services
- [ ] Add integration tests for critical API routes and RBAC behavior
- [ ] Add end-to-end smoke coverage for login, onboarding, transaction entry, shift close, and reconciliation approval
- [ ] Review mobile responsiveness across all major screens
- [ ] Improve UX details: validation messages, form defaults, loading states, destructive action confirmations, and table usability
- [ ] Add production email provider integration
- [ ] Add rate limiting and security header configuration
- [ ] Add structured logging and error monitoring
- [ ] Add backup, restore, and incident-response runbooks
- [ ] Add staging environment and deployment checklist
- [ ] Validate production migration strategy for Prisma and seed/demo data separation
- [ ] Add release checklist and launch criteria

### Sprint 7 Dependencies

- Functional MVP flows from Sprints 1 through 6
- CI from Sprint 0
- Final environment and infrastructure decisions

### Sprint 7 Risks

- Delaying testing until the end can surface regressions late
- Production-only failures can appear without staging parity
- Launching without observability will slow support and debugging

### Sprint 7 Definition of Done

- Critical workflows are covered by automated tests
- Staging and production deployment steps are documented and repeatable
- Monitoring, logging, backups, and security basics are in place
- The team can release with known risks explicitly tracked
- The MVP is ready for pilot customers

---

## Cross-Sprint Dependency Summary

### Highest-priority dependency chain

- Sprint 0 establishes the engineering baseline
- Sprint 1 establishes identity, tenancy, and permissions
- Sprint 2 establishes clean operational data capture
- Sprint 3 establishes financial correctness
- Sprint 4 depends on Sprint 3 for trusted reconciliation
- Sprint 5 depends on Sprint 3 and Sprint 4 for trusted reporting
- Sprint 6 depends on domain events and stable controls from earlier sprints
- Sprint 7 validates and hardens everything before launch

### Areas that should not be delayed too long

- Automated tests should begin in Sprint 3, not only Sprint 7
- CI should begin in Sprint 0
- Alert trigger design should be decided by Sprint 0 or Sprint 1 even if implemented later
- Super-admin scope should be clarified early, even if the UI lands after MVP

---

## Suggested Prioritization of What Is Left

If time is constrained, prioritize the remaining work in this order:

1. Tenant isolation and RBAC consistency
2. Transaction correctness and approval flows
3. Ledger reversal correctness
4. Shift and reconciliation integrity
5. Invitation/email and password reset flows
6. Report correctness and performance
7. Alert completeness and audit coverage
8. Deployment hardening and observability

---

## MVP Exit Criteria

The MVP should be considered ready only when the following are true:

- A new owner can register, onboard, and create an organization without manual intervention
- Staff can be invited, join, and work within assigned branches only
- Transactions can be recorded accurately for supported operational scenarios
- Ledger-derived balances remain correct after normal operations, approvals, voids, and reversals
- Shifts and reconciliation can be completed daily by branch staff and approvers
- Dashboard and report totals are trusted by the team
- Alerts and audit logs support issue detection and investigation
- The app has automated tests for critical financial and authorization logic
- The app can be deployed and monitored safely in production
