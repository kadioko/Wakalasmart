"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@client/components/ui/button";
import { Card } from "@client/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@client/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@client/components/ui/dialog";
import { Label } from "@client/components/ui/label";
import { Input } from "@client/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@client/components/ui/select";
import { formatDateTime, getStatusColor } from "@/lib/utils";
import { Check, Plus } from "lucide-react";

interface ShiftTillItem {
  id: string;
  tillId: string;
  openingBalance: number;
  till: {
    id: string;
    name: string;
    type: string;
    provider?: { name: string } | null;
  };
}

interface ShiftRow {
  id: string;
  openedAt: string;
  closedAt?: string;
  status: string;
  branch: { name: string };
  openedBy: { name: string };
  _count: { transactions: number };
  shiftTills: ShiftTillItem[];
}

export default function ShiftsPage() {
  const [openShiftOpen, setOpenShiftOpen] = useState(false);
  const [closeShiftOpen, setCloseShiftOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedShift, setSelectedShift] = useState<ShiftRow | null>(null);
  const [closingNotes, setClosingNotes] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["shifts"],
    queryFn: () => fetch("/api/v1/shifts?pageSize=30").then((r) => r.json()),
  });

  const { data: branchesData } = useQuery({
    queryKey: ["branches"],
    queryFn: () => fetch("/api/v1/branches").then((r) => r.json()),
  });

  const { data: tillsData } = useQuery({
    queryKey: ["tills", selectedBranch],
    queryFn: () =>
      fetch(`/api/v1/tills?branchId=${selectedBranch}`).then((r) => r.json()),
    enabled: !!selectedBranch,
  });

  const branches = branchesData?.data ?? [];
  const tills = tillsData?.data ?? [];
  const shifts = data?.data?.data ?? [];

  const [openingBalances, setOpeningBalances] = useState<Record<string, number>>({});
  const [closingBalances, setClosingBalances] = useState<Record<string, { countedBalance: number; varianceNotes: string }>>({});

  const openShiftMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        branchId: selectedBranch,
        openingBalances: Object.entries(openingBalances).map(([tillId, balance]) => ({
          tillId,
          openingBalance: balance,
        })),
      };
      const res = await fetch("/api/v1/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      setOpenShiftOpen(false);
      setSelectedBranch("");
      setOpeningBalances({});
    },
  });

  const closeShiftMutation = useMutation({
    mutationFn: async () => {
      if (!selectedShift) {
        throw new Error("No shift selected");
      }

      const payload = {
        closingBalances: selectedShift.shiftTills.map((shiftTill) => ({
          tillId: shiftTill.tillId,
          countedBalance: closingBalances[shiftTill.tillId]?.countedBalance ?? Number(shiftTill.openingBalance),
          varianceNotes: closingBalances[shiftTill.tillId]?.varianceNotes || undefined,
        })),
        notes: closingNotes || undefined,
      };

      const res = await fetch(`/api/v1/shifts/${selectedShift.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      setCloseShiftOpen(false);
      setSelectedShift(null);
      setClosingNotes("");
      setClosingBalances({});
    },
  });

  const openCloseDialog = (shift: ShiftRow) => {
    setSelectedShift(shift);
    setClosingNotes("");
    setClosingBalances(
      Object.fromEntries(
        shift.shiftTills.map((item) => [
          item.tillId,
          {
            countedBalance: Number(item.openingBalance),
            varianceNotes: "",
          },
        ])
      )
    );
    setCloseShiftOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Shifts</h1>
          <p className="text-sm text-muted-foreground">{shifts.length} recent shifts</p>
        </div>
        <Dialog open={openShiftOpen} onOpenChange={setOpenShiftOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Open Shift
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Open New Shift</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Branch</Label>
                <Select onValueChange={setSelectedBranch}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b: { id: string; name: string }) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {tills.length > 0 && (
                <div className="space-y-3">
                  <Label>Opening Balances</Label>
                  {tills.map((till: { id: string; name: string; type: string; provider?: { name: string } | null }) => (
                    <div key={till.id} className="flex items-center gap-3">
                      <span className="text-sm w-36">
                        {till.name}
                        {till.provider && (
                          <span className="text-xs text-muted-foreground block">
                            {till.provider.name}
                          </span>
                        )}
                      </span>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        className="flex-1"
                        onChange={(e) =>
                          setOpeningBalances((prev) => ({
                            ...prev,
                            [till.id]: parseFloat(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              )}

              {openShiftMutation.isError && (
                <p className="text-sm text-destructive">
                  {openShiftMutation.error?.message}
                </p>
              )}

              <Button
                className="w-full"
                disabled={!selectedBranch || openShiftMutation.isPending}
                onClick={() => openShiftMutation.mutate()}
              >
                {openShiftMutation.isPending ? "Opening..." : "Open Shift"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={closeShiftOpen} onOpenChange={setCloseShiftOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Close Shift</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedShift?.shiftTills.map((shiftTill) => {
                const state = closingBalances[shiftTill.tillId];
                return (
                  <div key={shiftTill.id} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">{shiftTill.till.name}</p>
                        {shiftTill.till.provider && (
                          <p className="text-xs text-muted-foreground">{shiftTill.till.provider.name}</p>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Opening: {Number(shiftTill.openingBalance).toLocaleString()}
                      </p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Counted Balance</Label>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={state?.countedBalance ?? Number(shiftTill.openingBalance)}
                          onChange={(e) =>
                            setClosingBalances((prev) => ({
                              ...prev,
                              [shiftTill.tillId]: {
                                countedBalance: parseFloat(e.target.value) || 0,
                                varianceNotes: prev[shiftTill.tillId]?.varianceNotes || "",
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Variance Notes</Label>
                        <Input
                          placeholder="Optional notes"
                          value={state?.varianceNotes ?? ""}
                          onChange={(e) =>
                            setClosingBalances((prev) => ({
                              ...prev,
                              [shiftTill.tillId]: {
                                countedBalance: prev[shiftTill.tillId]?.countedBalance ?? Number(shiftTill.openingBalance),
                                varianceNotes: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="space-y-1.5">
                <Label>Closing Notes</Label>
                <Input
                  placeholder="Optional shift notes"
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                />
              </div>

              {closeShiftMutation.isError && (
                <p className="text-sm text-destructive">{closeShiftMutation.error?.message}</p>
              )}

              <Button
                className="w-full"
                disabled={!selectedShift || closeShiftMutation.isPending}
                onClick={() => closeShiftMutation.mutate()}
              >
                {closeShiftMutation.isPending ? "Closing..." : "Close Shift"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Opened At</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Opened By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Transactions</TableHead>
                <TableHead>Closed At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(7)].map((_, j) => (
                      <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : shifts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No shifts yet. Open a shift to start recording transactions.
                  </TableCell>
                </TableRow>
              ) : (
                shifts.map((shift: ShiftRow) => (
                  <TableRow key={shift.id}>
                    <TableCell className="text-sm">{formatDateTime(shift.openedAt)}</TableCell>
                    <TableCell className="font-medium text-sm">{shift.branch?.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{shift.openedBy?.name}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(shift.status)}`}>
                        {shift.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-center">{shift._count?.transactions ?? 0}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {shift.closedAt ? formatDateTime(shift.closedAt) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {shift.status === "OPEN" ? (
                        <Button size="sm" variant="outline" className="h-8" onClick={() => openCloseDialog(shift)}>
                          <Check className="h-3 w-3" />
                          Close Shift
                        </Button>
                      ) : null}
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
