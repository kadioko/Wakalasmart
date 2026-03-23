import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WakalaSmart — Sign In",
  description: "Wakala Operating System for Mobile Money Agents",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground text-xl font-bold mb-3">
            W
          </div>
          <h1 className="text-2xl font-bold">WakalaSmart</h1>
          <p className="text-sm text-muted-foreground">
            Wakala Operating System
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
