import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@server/lib/db";
import { sendPasswordResetEmail } from "@server/lib/email";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // set true in production
    async sendResetPassword({ user, url }) {
      await sendPasswordResetEmail({
        to: user.email,
        resetUrl: url,
      });
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh every 24h
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  advanced: {
    database: {
      generateId: () => crypto.randomUUID().replace(/-/g, "").slice(0, 24),
    },
  },
});

export type Session = typeof auth.$Infer.Session;
