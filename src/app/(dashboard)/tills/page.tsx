"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@client/components/ui/button";
import { Card } from "@client/components/ui/card";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@client/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@client/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@client/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { Plus, Wallet, Smartphone } from "lucide-react";

export default function TillsPage() {
  const [newTillOpen, setNewTillOpen] = useState(false);
  const [branchId, setBranchId] = useState("");
  const [tillType, setTillType] = useState<"CASH_BOX" | "FLOAT_ACCOUNT">("CASH_BOX");
  const [providerId, setProviderId] = useState("");
  const [name, setName] = useState("");
  const queryClient = useQueryClient();

  const { data: branchesData } = useQuery({
    queryKey: ["branches"],
    queryFn: () => fetch("/api/v1/branches").then((r) => r.json()),
  });

  const { data: providersData } = useQuery({
    queryKey: ["providers"],
    queryFn: () => fetch("/api/v1/providers").then((r) => r.json()),
  });

  const { data: tillsData, isLoading } = useQuery({
    queryKey: ["tills"],
    queryFn: () => fetch("/api/v1/tills").then((r) => r.json()),
  });

  const branches = branchesData?.data ?? [];
  const providers = providersData?.data ?? [];
  const tills = tillsData?.data ?? [];

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/tills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId, name, type: tillType, providerId: tillType === "FLOAT_ACCOUNT" ? providerId : undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tills"] });
      setNewTillOpen(false);
      setName(""); setBranchId(""); setTillType("CASH_BOX"); setProviderId("");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tills & Accounts</h1>
          <p className="text-sm text-muted-foreground">{tills.length} tills</p>
        </div>
        <Dialog open={newTillOpen} onOpenChange={setNewTillOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" />Add Till</Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Create Till / Account</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Branch *</Label>
                <Select onValueChange={setBranchId}>
                  <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b: { id: string; name: string }) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Type *</Label>
                <Select value={tillType} onValueChange={(v) => setTillType(v as "CASH_BOX" | "FLOAT_ACCOUNT")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH_BOX">Cash Box</SelectItem>
                    <SelectItem value="FLOAT_ACCOUNT">Float Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {tillType === "FLOAT_ACCOUNT" && (
                <div className="space-y-1.5">
                  <Label>Provider *</Label>
                  <Select onValueChange={setProviderId}>
                    <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                    <SelectContent>
                      {providers.map((p: { id: string; name: string }) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Main Cash Box" />
              </div>
              {createMutation.isError && (
                <p className="text-sm text-destructive">{createMutation.error?.message}</p>
              )}
              <Button className="w-full" disabled={!branchId || !name || createMutation.isPending} onClick={() => createMutation.mutate()}>
                {createMutation.isPending ? "Creating..." : "Create Till"}
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
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead className="text-right">Current Balance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>{[...Array(6)].map((_, j) => <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>)}</TableRow>
                ))
              ) : tills.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No tills configured yet.
                  </TableCell>
                </TableRow>
              ) : (
                tills.map((till: {
                  id: string;
                  name: string;
                  type: string;
                  status: string;
                  currentBalance: number;
                  branch: { name: string };
                  provider?: { name: string } | null;
                }) => (
                  <TableRow key={till.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {till.type === "CASH_BOX" ? (
                          <Wallet className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <Smartphone className="h-4 w-4 text-blue-500" />
                        )}
                        <span className="text-sm font-medium">{till.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {till.type === "CASH_BOX" ? "Cash Box" : "Float Account"}
                    </TableCell>
                    <TableCell className="text-sm">{till.branch?.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{till.provider?.name ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">
                      {formatCurrency(till.currentBalance ?? 0)}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        till.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                      }`}>
                        {till.status}
                      </span>
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
