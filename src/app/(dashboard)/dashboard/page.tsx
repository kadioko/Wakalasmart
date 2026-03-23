"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, getStatusColor } from "@/lib/utils";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Banknote,
  Smartphone,
  Clock,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import type { DashboardStats } from "@/types";

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconClass = "text-muted-foreground",
  trend,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  iconClass?: string;
  trend?: { value: number; label: string };
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
            {subtitle && (
              <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={`rounded-lg bg-secondary p-2 ${iconClass}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {trend && (
          <p
            className={`mt-2 text-xs ${
              trend.value >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}% {trend.label}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: statsData, isLoading } = useQuery<{ data: DashboardStats }>({
    queryKey: ["dashboard-stats"],
    queryFn: () => fetch("/api/v1/dashboard").then((r) => r.json()),
    refetchInterval: 60000,
  });

  const { data: trendsData } = useQuery({
    queryKey: ["dashboard-trends"],
    queryFn: () =>
      fetch("/api/v1/dashboard?type=trends&days=7").then((r) => r.json()),
    refetchInterval: 300000,
  });

  const stats = statsData?.data;
  const trends = trendsData?.data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Today&apos;s overview — {new Date().toLocaleDateString("en-TZ", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <StatCard
          title="Cash In Today"
          value={formatCurrency(stats?.totalCashInToday ?? 0)}
          subtitle={`${stats?.totalTransactionsToday ?? 0} transactions`}
          icon={ArrowDownCircle}
          iconClass="text-green-600"
        />
        <StatCard
          title="Cash Out Today"
          value={formatCurrency(stats?.totalCashOutToday ?? 0)}
          icon={ArrowUpCircle}
          iconClass="text-red-600"
        />
        <StatCard
          title="Commission Today"
          value={formatCurrency(stats?.totalCommissionsToday ?? 0)}
          icon={TrendingUp}
          iconClass="text-blue-600"
        />
        <StatCard
          title="Cash Balance"
          value={formatCurrency(stats?.currentCashBalance ?? 0)}
          subtitle="All branches"
          icon={Banknote}
          iconClass="text-yellow-600"
        />
      </div>

      {/* Status Row */}
      <div className="grid gap-4 grid-cols-3 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-xs text-muted-foreground">Active Alerts</p>
                <p className="text-xl font-bold">{stats?.activeAlerts ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Open Shifts</p>
                <p className="text-xl font-bold">{stats?.openShifts ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Unreconciled</p>
                <p className="text-xl font-bold">
                  {stats?.unreconciledBranches ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Float Balances */}
      {stats?.floatBalances && stats.floatBalances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Float Balances by Provider
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              {stats.floatBalances.map((fb) => (
                <div
                  key={fb.providerId}
                  className={`rounded-lg border p-3 ${
                    fb.isLow ? "border-red-300 bg-red-50" : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-muted-foreground">
                      {fb.providerName}
                    </p>
                    {fb.isLow && (
                      <Badge variant="destructive" className="text-[10px] h-4 px-1">
                        LOW
                      </Badge>
                    )}
                  </div>
                  <p className="text-base font-bold tabular-nums">
                    {formatCurrency(fb.balance)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">7-Day Transaction Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => v.slice(5)}
                  className="text-xs"
                />
                <YAxis
                  tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
                  className="text-xs"
                  width={40}
                />
                <Tooltip
                  formatter={(v) => formatCurrency(v as number)}
                  labelFormatter={(l) =>
                    new Date(l).toLocaleDateString("en-TZ", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                />
                <Area
                  type="monotone"
                  dataKey="deposits"
                  name="Deposits"
                  stroke="#3b82f6"
                  fill="#3b82f620"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="withdrawals"
                  name="Withdrawals"
                  stroke="#ef4444"
                  fill="#ef444420"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Branch Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Branch Performance Today</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.branches && stats.branches.length > 0 ? (
              <div className="space-y-3">
                {stats.branches.map((branch) => (
                  <div
                    key={branch.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-bold">
                        {branch.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{branch.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {branch.txCountToday} txns today
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {formatCurrency(branch.commissionToday)}
                      </p>
                      <div className="flex items-center gap-1 justify-end">
                        {branch.hasOpenShift ? (
                          <Badge variant="info" className="text-[10px] h-4 px-1">
                            Open
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1">
                            Closed
                          </Badge>
                        )}
                        {branch.isReconciled ? (
                          <Badge variant="success" className="text-[10px] h-4 px-1">
                            ✓ Rec
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="text-[10px] h-4 px-1">
                            Pending
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-8">
                No branch data available
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
