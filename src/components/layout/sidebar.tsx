"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ArrowRightLeft,
  GitBranch,
  Wallet,
  Users,
  Clock,
  CheckSquare,
  Receipt,
  BarChart3,
  Bell,
  Shield,
  Settings,
  LogOut,
  Building2,
  Smartphone,
} from "lucide-react";
import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

const navigation = [
  {
    group: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    group: "Operations",
    items: [
      { href: "/transactions", label: "Transactions", icon: ArrowRightLeft },
      { href: "/shifts", label: "Shifts", icon: Clock },
      { href: "/reconciliation", label: "Reconciliation", icon: CheckSquare },
      { href: "/expenses", label: "Expenses", icon: Receipt },
    ],
  },
  {
    group: "Management",
    items: [
      { href: "/branches", label: "Branches", icon: GitBranch },
      { href: "/tills", label: "Tills & Accounts", icon: Wallet },
      { href: "/providers", label: "Providers", icon: Smartphone },
      { href: "/staff", label: "Staff", icon: Users },
    ],
  },
  {
    group: "Insights",
    items: [
      { href: "/reports", label: "Reports", icon: BarChart3 },
      { href: "/alerts", label: "Alerts", icon: Bell },
      { href: "/audit-logs", label: "Audit Logs", icon: Shield },
    ],
  },
  {
    group: "System",
    items: [
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Building2 className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-bold leading-none">WakalaSmart</p>
          <p className="text-xs text-muted-foreground">Agent OS</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {navigation.map((group) => (
          <div key={group.group} className="mb-4">
            <p className="mb-1 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group.group}
            </p>
            {group.items.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-6 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Sign out */}
      <div className="border-t p-4">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
