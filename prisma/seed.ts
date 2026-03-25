/**
 * WakalaSmart Database Seed
 * Creates a demo organization with realistic Tanzanian wakala data
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/wakalasmart",
});
const db = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding WakalaSmart demo data...");

  // Clean existing demo data
  await db.auditLog.deleteMany({});
  await db.alert.deleteMany({});
  await db.reconciliationFloatItem.deleteMany({});
  await db.reconciliation.deleteMany({});
  await db.cashLedgerEntry.deleteMany({});
  await db.floatLedgerEntry.deleteMany({});
  await db.shiftTill.deleteMany({});
  await db.shift.deleteMany({});
  await db.transaction.deleteMany({});
  await db.expense.deleteMany({});
  await db.till.deleteMany({});
  await db.provider.deleteMany({});
  await db.userBranch.deleteMany({});
  await db.branch.deleteMany({});
  await db.invitation.deleteMany({});
  await db.organizationSettings.deleteMany({});
  await db.alertSettings.deleteMany({});
  await db.organization.deleteMany({});
  await db.account.deleteMany({});
  await db.session.deleteMany({});
  await db.verification.deleteMany({});
  await db.user.deleteMany({ where: { role: { not: "SUPER_ADMIN" } } });

  console.log("  ✓ Cleared existing data");

  // ============================================================
  // 1. CREATE ORGANIZATION
  // ============================================================
  const org = await db.organization.create({
    data: {
      name: "Amina Wakala Services",
      slug: "amina-wakala",
      status: "ACTIVE",
      phone: "+255755123456",
      email: "amina@aminawakala.co.tz",
      address: "Kariakoo Market, Stall 45",
      city: "Dar es Salaam",
    },
  });

  await db.organizationSettings.create({
    data: {
      organizationId: org.id,
      shiftsMandatory: true,
      requireApprovalForReversals: true,
      requireApprovalForAdjustments: true,
      roleSeparationEnabled: true,
      lowCashThreshold: 200000,
      largeTxThreshold: 2000000,
    },
  });

  console.log(`  ✓ Organization: ${org.name}`);

  // ============================================================
  // 2. CREATE USERS
  // ============================================================
  const ownerUser = await db.user.create({
    data: {
      organizationId: org.id,
      email: "amina@aminawakala.co.tz",
      name: "Amina Mohamed",
      role: "OWNER",
      emailVerified: true,
    },
  });

  // Create Better Auth account for owner (password: Demo@1234)
  const demoPassword = await hashPassword("Demo@1234");
  await db.account.create({
    data: {
      userId: ownerUser.id,
      accountId: ownerUser.id,
      providerId: "credential",
      password: demoPassword,
    },
  });

  const managerUser = await db.user.create({
    data: {
      organizationId: org.id,
      email: "juma@aminawakala.co.tz",
      name: "Juma Salim",
      role: "BRANCH_MANAGER",
      emailVerified: true,
    },
  });

  await db.account.create({
    data: {
      userId: managerUser.id,
      accountId: managerUser.id,
      providerId: "credential",
      password: demoPassword,
    },
  });

  const cashier1 = await db.user.create({
    data: {
      organizationId: org.id,
      email: "fatuma@aminawakala.co.tz",
      name: "Fatuma Hassan",
      role: "CASHIER",
      emailVerified: true,
    },
  });

  await db.account.create({
    data: {
      userId: cashier1.id,
      accountId: cashier1.id,
      providerId: "credential",
      password: demoPassword,
    },
  });

  const cashier2 = await db.user.create({
    data: {
      organizationId: org.id,
      email: "said@aminawakala.co.tz",
      name: "Said Omar",
      role: "CASHIER",
      emailVerified: true,
    },
  });

  await db.account.create({
    data: {
      userId: cashier2.id,
      accountId: cashier2.id,
      providerId: "credential",
      password: demoPassword,
    },
  });

  // Create SUPER_ADMIN user (platform-level admin, no organization)
  const superAdmin = await db.user.create({
    data: {
      email: "admin@wakalasmart.co.tz",
      name: "Platform Admin",
      role: "SUPER_ADMIN",
      emailVerified: true,
    },
  });

  await db.account.create({
    data: {
      userId: superAdmin.id,
      accountId: superAdmin.id,
      providerId: "credential",
      password: demoPassword,
    },
  });

  console.log("  ✓ Users created (owner, manager, 2 cashiers, super admin)");

  // ============================================================
  // 3. CREATE BRANCHES
  // ============================================================
  const branch1 = await db.branch.create({
    data: {
      organizationId: org.id,
      name: "Kariakoo Main Branch",
      code: "KRK-001",
      location: "Kariakoo Market, Dar es Salaam",
      phone: "+255755123456",
      openingTime: "08:00",
      closingTime: "18:00",
    },
  });

  const branch2 = await db.branch.create({
    data: {
      organizationId: org.id,
      name: "Ilala Branch",
      code: "ILA-001",
      location: "Ilala, Dar es Salaam",
      phone: "+255755789012",
      openingTime: "08:00",
      closingTime: "17:30",
    },
  });

  // Assign users to branches
  await db.userBranch.createMany({
    data: [
      { userId: managerUser.id, branchId: branch1.id },
      { userId: managerUser.id, branchId: branch2.id },
      { userId: cashier1.id, branchId: branch1.id },
      { userId: cashier2.id, branchId: branch2.id },
    ],
  });

  // Alert settings per branch
  await db.alertSettings.createMany({
    data: [
      { organizationId: org.id, branchId: branch1.id, lowCashThreshold: 200000 },
      { organizationId: org.id, branchId: branch2.id, lowCashThreshold: 150000 },
      { organizationId: org.id }, // org-wide
    ],
  });

  console.log(`  ✓ Branches: ${branch1.name}, ${branch2.name}`);

  // ============================================================
  // 4. CREATE PROVIDERS
  // ============================================================
  const [mpesa, airtel, tigo, halo] = await Promise.all([
    db.provider.create({
      data: {
        organizationId: org.id,
        name: "M-Pesa",
        code: "MPESA",
        commissionRate: 0.0065,
        lowFloatThreshold: 500000,
      },
    }),
    db.provider.create({
      data: {
        organizationId: org.id,
        name: "Airtel Money",
        code: "AIRTEL",
        commissionRate: 0.006,
        lowFloatThreshold: 300000,
      },
    }),
    db.provider.create({
      data: {
        organizationId: org.id,
        name: "Tigo Pesa",
        code: "TIGO",
        commissionRate: 0.0055,
        lowFloatThreshold: 200000,
      },
    }),
    db.provider.create({
      data: {
        organizationId: org.id,
        name: "HaloPesa",
        code: "HALOPESA",
        commissionRate: 0.005,
        lowFloatThreshold: 150000,
      },
    }),
  ]);

  console.log("  ✓ Providers: M-Pesa, Airtel, Tigo, HaloPesa");

  // ============================================================
  // 5. CREATE TILLS
  // ============================================================
  const cashTill1 = await db.till.create({
    data: {
      organizationId: org.id,
      branchId: branch1.id,
      name: "Main Cash Box",
      type: "CASH_BOX",
    },
  });

  const mpesaTill1 = await db.till.create({
    data: {
      organizationId: org.id,
      branchId: branch1.id,
      providerId: mpesa.id,
      name: "M-Pesa Float",
      type: "FLOAT_ACCOUNT",
    },
  });

  const airtelTill1 = await db.till.create({
    data: {
      organizationId: org.id,
      branchId: branch1.id,
      providerId: airtel.id,
      name: "Airtel Float",
      type: "FLOAT_ACCOUNT",
    },
  });

  const tigoTill1 = await db.till.create({
    data: {
      organizationId: org.id,
      branchId: branch1.id,
      providerId: tigo.id,
      name: "Tigo Float",
      type: "FLOAT_ACCOUNT",
    },
  });

  const cashTill2 = await db.till.create({
    data: {
      organizationId: org.id,
      branchId: branch2.id,
      name: "Ilala Cash Box",
      type: "CASH_BOX",
    },
  });

  const mpesaTill2 = await db.till.create({
    data: {
      organizationId: org.id,
      branchId: branch2.id,
      providerId: mpesa.id,
      name: "M-Pesa Float",
      type: "FLOAT_ACCOUNT",
    },
  });

  const airtelTill2 = await db.till.create({
    data: {
      organizationId: org.id,
      branchId: branch2.id,
      providerId: airtel.id,
      name: "Airtel Float",
      type: "FLOAT_ACCOUNT",
    },
  });

  console.log("  ✓ Tills created");

  // ============================================================
  // 6. SEED OPENING BALANCES (ledger entries)
  // ============================================================
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(8, 0, 0, 0);

  // Branch 1 opening balances
  await db.cashLedgerEntry.create({
    data: {
      organizationId: org.id,
      branchId: branch1.id,
      tillId: cashTill1.id,
      entryType: "CREDIT",
      amount: 1500000,
      balanceAfter: 1500000,
      description: "Opening balance",
      entryDate: yesterday,
    },
  });

  const floatOpenings = [
    { tillId: mpesaTill1.id, providerId: mpesa.id, amount: 2000000 },
    { tillId: airtelTill1.id, providerId: airtel.id, amount: 800000 },
    { tillId: tigoTill1.id, providerId: tigo.id, amount: 600000 },
    { tillId: mpesaTill2.id, providerId: mpesa.id, amount: 1200000 },
    { tillId: airtelTill2.id, providerId: airtel.id, amount: 500000 },
  ];

  for (const fo of floatOpenings) {
    await db.floatLedgerEntry.create({
      data: {
        organizationId: org.id,
        branchId: fo.tillId === mpesaTill2.id || fo.tillId === airtelTill2.id ? branch2.id : branch1.id,
        tillId: fo.tillId,
        providerId: fo.providerId,
        entryType: "CREDIT",
        amount: fo.amount,
        balanceAfter: fo.amount,
        description: "Opening float balance",
        entryDate: yesterday,
      },
    });
  }

  await db.cashLedgerEntry.create({
    data: {
      organizationId: org.id,
      branchId: branch2.id,
      tillId: cashTill2.id,
      entryType: "CREDIT",
      amount: 900000,
      balanceAfter: 900000,
      description: "Opening balance",
      entryDate: yesterday,
    },
  });

  console.log("  ✓ Opening balances seeded");

  // ============================================================
  // 7. SEED SAMPLE TRANSACTIONS (today)
  // ============================================================
  const today = new Date();
  today.setHours(9, 0, 0, 0);

  const sampleTxs = [
    // Branch 1 - Deposits (Cash In, Float Out)
    { type: "DEPOSIT", amount: 150000, commission: 975, tillId: mpesaTill1.id, providerId: mpesa.id, branchId: branch1.id, ref: "MP240001", createdById: cashier1.id },
    { type: "DEPOSIT", amount: 300000, commission: 1950, tillId: mpesaTill1.id, providerId: mpesa.id, branchId: branch1.id, ref: "MP240002", createdById: cashier1.id },
    { type: "WITHDRAWAL", amount: 200000, commission: 1300, tillId: mpesaTill1.id, providerId: mpesa.id, branchId: branch1.id, ref: "MP240003", createdById: cashier1.id },
    { type: "DEPOSIT", amount: 75000, commission: 450, tillId: airtelTill1.id, providerId: airtel.id, branchId: branch1.id, ref: "ART240001", createdById: cashier1.id },
    { type: "WITHDRAWAL", amount: 50000, commission: 300, tillId: airtelTill1.id, providerId: airtel.id, branchId: branch1.id, ref: "ART240002", createdById: cashier1.id },
    { type: "FLOAT_PURCHASE", amount: 500000, commission: 0, tillId: mpesaTill1.id, providerId: mpesa.id, branchId: branch1.id, ref: "FP240001", createdById: cashier1.id },
    // Branch 2
    { type: "DEPOSIT", amount: 100000, commission: 650, tillId: mpesaTill2.id, providerId: mpesa.id, branchId: branch2.id, ref: "MP240010", createdById: cashier2.id },
    { type: "WITHDRAWAL", amount: 250000, commission: 1625, tillId: mpesaTill2.id, providerId: mpesa.id, branchId: branch2.id, ref: "MP240011", createdById: cashier2.id },
    { type: "DEPOSIT", amount: 180000, commission: 1080, tillId: airtelTill2.id, providerId: airtel.id, branchId: branch2.id, ref: "ART240010", createdById: cashier2.id },
    { type: "AIRTIME_SALE", amount: 10000, commission: 500, tillId: cashTill2.id, providerId: null, branchId: branch2.id, ref: "ATM240001", createdById: cashier2.id },
  ];

  for (let i = 0; i < sampleTxs.length; i++) {
    const tx = sampleTxs[i];
    const txTime = new Date(today);
    txTime.setMinutes(i * 15);

    await db.transaction.create({
      data: {
        organizationId: org.id,
        branchId: tx.branchId,
        tillId: tx.tillId,
        providerId: tx.providerId ?? undefined,
        type: tx.type as Parameters<typeof db.transaction.create>[0]["data"]["type"],
        status: "COMPLETED",
        amount: tx.amount,
        commission: tx.commission,
        reference: tx.ref,
        createdById: tx.createdById,
        transactedAt: txTime,
      },
    });
  }

  console.log(`  ✓ ${sampleTxs.length} sample transactions seeded`);

  // ============================================================
  // 8. SAMPLE EXPENSES
  // ============================================================
  await db.expense.createMany({
    data: [
      {
        organizationId: org.id,
        branchId: branch1.id,
        category: "RENT",
        description: "Monthly shop rent - Kariakoo",
        amount: 350000,
        createdById: ownerUser.id,
        status: "APPROVED",
        paidAt: new Date(today.getFullYear(), today.getMonth(), 1),
      },
      {
        organizationId: org.id,
        branchId: branch1.id,
        category: "UTILITIES",
        description: "Electricity bill",
        amount: 45000,
        createdById: managerUser.id,
        status: "APPROVED",
        paidAt: today,
      },
      {
        organizationId: org.id,
        branchId: branch2.id,
        category: "RENT",
        description: "Monthly shop rent - Ilala",
        amount: 280000,
        createdById: ownerUser.id,
        status: "APPROVED",
        paidAt: new Date(today.getFullYear(), today.getMonth(), 1),
      },
    ],
  });

  console.log("  ✓ Sample expenses seeded");

  // ============================================================
  // 9. SAMPLE ALERTS
  // ============================================================
  await db.alert.createMany({
    data: [
      {
        organizationId: org.id,
        branchId: branch2.id,
        type: "LOW_FLOAT",
        severity: "WARNING",
        title: "Low Airtel Float — Ilala Branch",
        message: "Airtel Money float is approaching the minimum threshold.",
        status: "UNREAD",
      },
      {
        organizationId: org.id,
        branchId: branch1.id,
        type: "LOW_CASH",
        severity: "INFO",
        title: "Cash balance approaching threshold",
        message: "Cash balance at Kariakoo is below TZS 200,000 alert level.",
        status: "READ",
        readAt: today,
      },
    ],
  });

  console.log("  ✓ Sample alerts seeded");

  console.log("\n✅ Seed complete!");
  console.log("\n📋 Demo login credentials:");
  console.log("  Owner:   amina@aminawakala.co.tz  / Demo@1234");
  console.log("  Manager: juma@aminawakala.co.tz   / Demo@1234");
  console.log("  Cashier: fatuma@aminawakala.co.tz / Demo@1234");
  console.log("\n🏢 Organization: Amina Wakala Services");
  console.log("🏪 Branches: Kariakoo Main, Ilala");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
