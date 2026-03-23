"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Download, BarChart3 } from "lucide-react";

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  DEPOSIT: "Cash In",
  WITHDRAWAL: "Cash Out",
  FLOAT_PURCHASE: "Float Purchase",
  AIRTIME_SALE: "Airtime",
  BILL_PAYMENT: "Bill Payment",
  TRANSFER: "Transfer",
  REVERSAL: "Reversal",
  EXPENSE: "Expense",
  OWNER_WITHDRAWAL: "Owner Withdrawal",
  OWNER_INJECTION: "Owner Injection",
  BANK_DEPOSIT: "Bank Deposit",
  BANK_WITHDRAWAL: "Bank Withdrawal",
};

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16"];

export default function ReportsPage() {
  const [reportType, setReportType] = useState("daily-summary");
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [branchId, setBranchId] = useState("all");

  const { data: branchesData } = useQuery({
    queryKey: ["branches"],
    queryFn: () => fetch("/api/v1/branches").then((r) => r.json()),
  });
  const branches = branchesData?.data ?? [];

  const params = new URLSearchParams({
    type: reportType,
    startDate,
    endDate,
    ...(branchId !== "all" && { branchId }),
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["reports", reportType, startDate, endDate, branchId],
    queryFn: () => fetch(`/api/v1/reports?${params}`).then((r) => r.json()),
    enabled: false,
  });

  const reportData = data?.data ?? [];

  const handleExportCsv = () => {
    if (!reportData.length) return;
    const headers = Object.keys(reportData[0]).join(",");
    const rows = reportData.map((row: Record<string, unknown>) =>
      Object.values(row).map((v) => JSON.stringify(v ?? "")).join(",")
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wakalasmart-${reportType}-${startDate}-${endDate}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Generate and export operational reports
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
            <div className="space-y-1">
              <Label className="text-xs">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily-summary">Daily Summary</SelectItem>
                  <SelectItem value="provider-performance">Provider Performance</SelectItem>
                  <SelectItem value="staff-performance">Staff Performance</SelectItem>
                  <SelectItem value="branch-performance">Branch Performance</SelectItem>
                  <SelectItem value="commission">Commission Report</SelectItem>
                  <SelectItem value="expenses">Expense Report</SelectItem>
                  <SelectItem value="variance">Variance / Loss Report</SelectItem>
                  <SelectItem value="reconciliation-history">Reconciliation History</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Branch</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((b: { id: string; name: string }) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={() => refetch()} className="flex-1" disabled={isLoading}>
                <BarChart3 className="h-4 w-4 mr-1" />
                {isLoading ? "Loading..." : "Run"}
              </Button>
              {reportData.length > 0 && (
                <Button variant="outline" onClick={handleExportCsv}>
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart Output */}
      {reportData.length > 0 && reportType === "daily-summary" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transaction Volume by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="type"
                  tickFormatter={(v) => TRANSACTION_TYPE_LABELS[v] ?? v}
                  className="text-xs"
                />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} className="text-xs" />
                <Tooltip
                  formatter={(v, name) =>
                    (name === "_sum.amount" ? formatCurrency(v as number) : formatNumber(v as number))
                  }
                  labelFormatter={(l) => TRANSACTION_TYPE_LABELS[l] ?? l}
                />
                <Bar dataKey="_sum.amount" name="Total Amount" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Type</th>
                    <th className="text-right py-2 font-medium">Count</th>
                    <th className="text-right py-2 font-medium">Amount</th>
                    <th className="text-right py-2 font-medium">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row: {
                    type: string;
                    _count: number;
                    _sum: { amount?: number; commission?: number };
                  }) => (
                    <tr key={row.type} className="border-b hover:bg-muted/50">
                      <td className="py-2">{TRANSACTION_TYPE_LABELS[row.type] ?? row.type}</td>
                      <td className="py-2 text-right tabular-nums">{formatNumber(row._count)}</td>
                      <td className="py-2 text-right tabular-nums font-medium">
                        {formatCurrency(row._sum?.amount ?? 0)}
                      </td>
                      <td className="py-2 text-right tabular-nums text-green-600">
                        {formatCurrency(row._sum?.commission ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {reportData.length > 0 && reportType === "provider-performance" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Provider Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={reportData}
                    dataKey="_sum.amount"
                    nameKey="provider.name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    label={((props: any) =>
                      `${props.provider?.name ?? "Unknown"}: ${((props.percent ?? 0) * 100).toFixed(0)}%`) as never}
                  >
                    {reportData.map((_: unknown, index: number) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v as number)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Provider</th>
                      <th className="text-right py-2">Transactions</th>
                      <th className="text-right py-2">Volume</th>
                      <th className="text-right py-2">Commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((row: {
                      providerId: string;
                      provider?: { name: string } | null;
                      _count: number;
                      _sum: { amount?: number; commission?: number };
                    }) => (
                      <tr key={row.providerId} className="border-b hover:bg-muted/50">
                        <td className="py-2 font-medium">{row.provider?.name ?? "—"}</td>
                        <td className="py-2 text-right">{formatNumber(row._count)}</td>
                        <td className="py-2 text-right tabular-nums">{formatCurrency(row._sum?.amount ?? 0)}</td>
                        <td className="py-2 text-right tabular-nums text-green-600">
                          {formatCurrency(row._sum?.commission ?? 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && reportData.length === 0 && data && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground text-sm">
              No data found for the selected period and filters.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
