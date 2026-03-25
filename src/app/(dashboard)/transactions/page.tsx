"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@client/components/ui/button";
import { Input } from "@client/components/ui/input";
import { Card, CardContent } from "@client/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@client/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@client/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@client/components/ui/dialog";
import { formatCurrency, formatDateTime, getStatusColor } from "@/lib/utils";
import { Plus, Search, Download } from "lucide-react";
import { NewTransactionForm } from "@client/components/transactions/new-transaction-form";


const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  DEPOSIT: "Cash In",
  WITHDRAWAL: "Cash Out",
  FLOAT_PURCHASE: "Float Purchase",
  AIRTIME_SALE: "Airtime Sale",
  BILL_PAYMENT: "Bill Payment",
  TRANSFER: "Transfer",
  MERCHANT_PAYMENT: "Merchant Payment",
  REVERSAL: "Reversal",
  ADJUSTMENT: "Adjustment",
  EXPENSE: "Expense",
  OWNER_WITHDRAWAL: "Owner Withdrawal",
  OWNER_INJECTION: "Owner Injection",
  BANK_DEPOSIT: "Bank Deposit",
  BANK_WITHDRAWAL: "Bank Withdrawal",
  INTER_BRANCH_TRANSFER: "Branch Transfer",
};

export default function TransactionsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [newTxOpen, setNewTxOpen] = useState(false);
  const queryClient = useQueryClient();

  const params = new URLSearchParams({
    page: String(page),
    pageSize: "30",
    ...(search && { search }),
    ...(typeFilter !== "all" && { type: typeFilter }),
    ...(statusFilter !== "all" && { status: statusFilter }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["transactions", params.toString()],
    queryFn: () =>
      fetch(`/api/v1/transactions?${params}`).then((r) => r.json()),
  });

  const transactions = data?.data?.data ?? [];
  const total = data?.data?.total ?? 0;
  const totalPages = data?.data?.totalPages ?? 1;

  const handleSuccess = () => {
    setNewTxOpen(false);
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            {total.toLocaleString()} total records
          </p>
        </div>
        <Dialog open={newTxOpen} onOpenChange={setNewTxOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              New Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Record Transaction</DialogTitle>
            </DialogHeader>
            <NewTransactionForm onSuccess={handleSuccess} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search reference, notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(TRANSACTION_TYPE_LABELS).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="VOIDED">Voided</SelectItem>
                <SelectItem value="REQUIRES_APPROVAL">Requires Approval</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(9)].map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-muted rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <p className="text-muted-foreground text-sm">
                      No transactions found
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx: {
                  id: string;
                  transactedAt: string;
                  type: string;
                  status: string;
                  amount: number;
                  commission: number;
                  reference?: string;
                  branch: { name: string };
                  provider?: { name: string } | null;
                  createdBy: { name: string };
                }) => (
                  <TableRow key={tx.id} className="cursor-pointer">
                    <TableCell className="text-xs">
                      {formatDateTime(tx.transactedAt)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">
                        {TRANSACTION_TYPE_LABELS[tx.type] ?? tx.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {tx.branch?.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {tx.provider?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">
                      {formatCurrency(tx.amount)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-green-600">
                      {Number(tx.commission) > 0
                        ? formatCurrency(tx.commission)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {tx.reference ?? "—"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(tx.status)}`}
                      >
                        {tx.status.replace("_", " ")}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {tx.createdBy?.name}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
