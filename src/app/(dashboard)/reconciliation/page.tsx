"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@client/components/ui/button";
import { Card } from "@client/components/ui/card";

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
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { Plus, CheckCircle2, XCircle } from "lucide-react";
import { ReconciliationForm } from "@client/components/reconciliation/reconciliation-form";

export default function ReconciliationPage() {
  const [newRecOpen, setNewRecOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["reconciliations"],
    queryFn: () => fetch("/api/v1/reconciliation?pageSize=30").then((r) => r.json()),
  });

  const recs = data?.data?.data ?? [];
  const total = data?.data?.total ?? 0;

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/reconciliation/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reconciliations"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await fetch(`/api/v1/reconciliation/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", reason }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reconciliations"] });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/reconciliation/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit" }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reconciliations"] });
    },
  });

  const varianceClass = (v: number) =>
    v === 0
      ? "text-green-600"
      : v > 0
        ? "text-blue-600"
        : "text-red-600 font-semibold";

  const handleReject = async (id: string) => {
    const reason = window.prompt("Reason for rejecting this reconciliation:");
    if (!reason || reason.trim().length < 5) {
      window.alert("Please provide a rejection reason of at least 5 characters.");
      return;
    }
    await rejectMutation.mutateAsync({ id, reason: reason.trim() });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Daily Reconciliation</h1>
          <p className="text-sm text-muted-foreground">
            {total} reconciliation records
          </p>
        </div>
        <Dialog open={newRecOpen} onOpenChange={setNewRecOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              New Reconciliation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Daily Reconciliation</DialogTitle>
            </DialogHeader>
            <ReconciliationForm
              onSuccess={() => {
                setNewRecOpen(false);
                queryClient.invalidateQueries({ queryKey: ["reconciliations"] });
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Opening Cash</TableHead>
                <TableHead className="text-right">Expected</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead>Submitted By</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(9)].map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-muted rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : recs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    No reconciliations yet. Start by creating one.
                  </TableCell>
                </TableRow>
              ) : (
                recs.map((rec: {
                  id: string;
                  date: string;
                  status: string;
                  openingCash: number;
                  expectedCash: number;
                  actualCash: number;
                  cashVariance: number;
                  branch: { name: string };
                  submittedBy?: { name: string } | null;
                }) => (
                  <TableRow key={rec.id}>
                    <TableCell className="font-medium">
                      {formatDate(rec.date)}
                    </TableCell>
                    <TableCell>{rec.branch?.name}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(rec.status)}`}
                      >
                        {rec.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {formatCurrency(rec.openingCash)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {formatCurrency(rec.expectedCash)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm font-medium">
                      {formatCurrency(rec.actualCash)}
                    </TableCell>
                    <TableCell className={`text-right tabular-nums text-sm ${varianceClass(Number(rec.cashVariance))}`}>
                      {Number(rec.cashVariance) > 0 ? "+" : ""}
                      {formatCurrency(rec.cashVariance)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {rec.submittedBy?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {rec.status === "DRAFT" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => submitMutation.mutate(rec.id)}
                            disabled={submitMutation.isPending}
                          >
                            Submit
                          </Button>
                        )}
                        {rec.status === "SUBMITTED" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => approveMutation.mutate(rec.id)}
                              disabled={approveMutation.isPending || rejectMutation.isPending}
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:text-destructive"
                              onClick={() => void handleReject(rec.id)}
                              disabled={approveMutation.isPending || rejectMutation.isPending}
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
