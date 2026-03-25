# WakalaSmart Test Accounts

## Purpose

This document lists the seeded demo users available in the live and local demo database, explains each role, and describes the main workflows each user should be able to perform.

These accounts are intended for:

- Manual QA
- UAT and stakeholder demos
- Role-based access verification
- Post-deploy smoke testing on Vercel

---

## Deployment Context

WakalaSmart is currently live with:

- App hosting on **Vercel**
- PostgreSQL hosting on **Railway**

The database has been seeded with a demo organization and example operational data.

---

## Seeded Organization

- **Organization:** `Amina Wakala Services`
- **Branches:**

  - `Kariakoo Main Branch`
  - `Ilala Branch`

- **Providers:**

  - `M-Pesa`
  - `Airtel Money`
  - `Tigo`
  - `HaloPesa`

---

## Test Accounts

| Role | Name | Email | Password | Branch Access |
| --- | --- | --- | --- | --- |
| Super Admin | Platform Admin | `admin@wakalasmart.co.tz` | `Demo@1234` | Platform-level (no organization) |
| Owner | Amina Mohamed | `amina@aminawakala.co.tz` | `Demo@1234` | All organization branches |
| Branch Manager | Juma Salim | `juma@aminawakala.co.tz` | `Demo@1234` | Kariakoo Main Branch, Ilala Branch |
| Cashier | Fatuma Hassan | `fatuma@aminawakala.co.tz` | `Demo@1234` | Kariakoo Main Branch |
| Cashier | Said Omar | `said@aminawakala.co.tz` | `Demo@1234` | Ilala Branch |

---

## Role Guide

### Super Admin

**Primary purpose:** Platform-level administration across all organizations.

**Typical responsibilities:**

- Monitor platform health and usage
- Manage organizations at the platform level
- Handle support escalations
- Access system-wide audit logs

**What the Super Admin should be able to do:**

- Access platform-level administrative functions
- View and manage all organizations
- Access system-wide data for support purposes

**What the Super Admin should not be able to do:**

- Operate as a regular user within a specific organization (no organization assignment)

**Recommended tests for Super Admin:**

- Log in and verify platform-level access
- Confirm no organization-specific dashboard appears (user has no organizationId)

---

### Owner

**Primary purpose:** Full organization administration and oversight.

**Typical responsibilities:**

- Set up and manage the organization
- Create and manage branches
- Manage providers and tills
- Invite staff
- Review reports and audit logs
- Monitor alerts and branch performance
- Approve sensitive operational workflows where required

**What the Owner should be able to do:**

- Access all dashboard areas
- View all branches and organization-wide data
- Create branches, providers, tills, and staff records
- Review transactions across the entire organization
- Access reports, reconciliation screens, alerts, and audit logs
- Update organization settings
- Use seeded demo data for end-to-end business walkthroughs

**Recommended tests for Owner:**

- Log in and verify organization-wide dashboard visibility
- Open `Branches`, `Providers`, `Tills`, `Staff`, `Reports`, `Alerts`, and `Settings`
- Confirm both branches are visible
- Confirm reports and audit logs load successfully
- Confirm low-level branch restrictions do not block owner access

---

### Branch Manager

**Primary purpose:** Run operations across assigned branches and supervise cashiers.

**Typical responsibilities:**

- Oversee daily branch activity
- Review operational health across assigned branches
- Help monitor reconciliation and shifts
- Support transaction review and staff workflow coordination

**What the Branch Manager should be able to do:**

- Access dashboard and assigned branch data
- View transactions, shifts, reconciliation, alerts, and audit-related operational records for assigned branches
- Work across the branches they are assigned to
- Participate in approval and oversight workflows allowed by the app

**What the Branch Manager should not be able to do:**

- Perform owner-only organization administration outside allowed scope
- Access another organization's data

**Recommended tests for Branch Manager:**

- Log in and verify both seeded branches are accessible
- Open dashboard and confirm branch-level operational visibility
- Check transaction lists and filters
- Check reconciliation and shift screens
- Confirm manager can operate within assigned branches without owner-level settings access if restricted

---

### Cashier

**Primary purpose:** Frontline transaction entry and shift operations.

**Typical responsibilities:**

- Record daily transactions
- Operate within assigned branch only
- Open and close shifts where permitted
- Participate in reconciliation data entry where permitted

**What the Cashier should be able to do:**

- Access their dashboard
- View and work only within their assigned branch
- Create transactions for day-to-day operations
- View their operational records, shift information, and branch-specific data relevant to their role

**What the Cashier should not be able to do:**

- Access owner-only configuration areas
- Manage organization-wide settings
- Work on branches they are not assigned to
- Access other organizations' data

**Branch assignments:**

- `fatuma@aminawakala.co.tz` → `Kariakoo Main Branch`
- `said@aminawakala.co.tz` → `Ilala Branch`

**Recommended tests for Cashier:**

- Log in as Fatuma and confirm only Kariakoo data is visible
- Log in as Said and confirm only Ilala data is visible
- Attempt transaction entry in assigned branch
- Verify branch scoping in lists, forms, and dashboards
- Confirm restricted areas are hidden or blocked

---

### Accountant

A seeded accountant account is **not currently included** in the demo seed.

**Intended purpose of the role:**

- Read-heavy financial review
- Reports and reconciliation oversight
- Audit log visibility
- Limited operational write access depending on feature area

If needed, an accountant user can be created manually from the app or by extending the seed file.

---

## Seeded Data Included

The seeded environment includes:

- Organization settings
- Branches and branch assignments
- Providers
- Tills
- Opening balances
- Sample transactions
- Sample expenses
- Sample alerts

This makes the environment useful for:

- Dashboard review
- Report validation
- Branch comparison checks
- Reconciliation and alert visibility tests

---

## Suggested Smoke Test Checklist

### Authentication

- Log in successfully with each seeded account
- Verify failed login handling with bad credentials
- Verify redirect to the correct post-login area

### RBAC

- Owner can access organization-wide areas
- Manager is limited to assigned operational scope
- Cashier is limited to assigned branch scope
- Restricted screens return blocked access or are hidden appropriately

### Branch Scoping

- Fatuma only sees Kariakoo Main Branch data
- Said only sees Ilala Branch data
- Manager can see both assigned branches
- Owner can see all organization data

### Operations

- Dashboard loads for all roles
- Transactions page loads and filters work
- Alerts page loads
- Reconciliation page loads
- Reports load for the appropriate roles
- Audit logs load for the appropriate roles

---

## Notes

- These accounts are based on the current seeded demo dataset.
- Re-seeding the database may reset demo records and overwrite changes made during testing.
- Passwords are shared only for demo/testing use and should not be used in a real production tenant.
- If additional roles are needed for demos, extend `prisma/seed.ts` and reseed the database.
