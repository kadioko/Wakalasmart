"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { Plus, Smartphone, TrendingUp } from "lucide-react";

const PROVIDER_COLORS: Record<string, string> = {
  MPESA: "bg-green-100 text-green-800 border-green-200",
  AIRTEL: "bg-red-100 text-red-800 border-red-200",
  TIGO: "bg-blue-100 text-blue-800 border-blue-200",
  HALOPESA: "bg-purple-100 text-purple-800 border-purple-200",
};

export default function ProvidersPage() {
  const [newProviderOpen, setNewProviderOpen] = useState(false);
  const [code, setCode] = useState<"MPESA" | "AIRTEL" | "TIGO" | "HALOPESA">("MPESA");
  const [name, setName] = useState("");
  const [commissionRate, setCommissionRate] = useState("0");
  const [lowFloatThreshold, setLowFloatThreshold] = useState("100000");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["providers"],
    queryFn: () => fetch("/api/v1/providers").then((r) => r.json()),
  });

  const providers = data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, code, commissionRate: parseFloat(commissionRate), lowFloatThreshold: parseFloat(lowFloatThreshold) }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      setNewProviderOpen(false);
    },
  });

  const PROVIDER_NAMES: Record<string, string> = {
    MPESA: "M-Pesa",
    AIRTEL: "Airtel Money",
    TIGO: "Tigo Pesa",
    HALOPESA: "HaloPesa",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Providers</h1>
          <p className="text-sm text-muted-foreground">Mobile money networks</p>
        </div>
        <Dialog open={newProviderOpen} onOpenChange={setNewProviderOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" />Add Provider</Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Add Provider</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Network *</Label>
                <Select value={code} onValueChange={(v) => {
                  setCode(v as typeof code);
                  setName(PROVIDER_NAMES[v] ?? v);
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MPESA">M-Pesa</SelectItem>
                    <SelectItem value="AIRTEL">Airtel Money</SelectItem>
                    <SelectItem value="TIGO">Tigo Pesa</SelectItem>
                    <SelectItem value="HALOPESA">HaloPesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Display Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Commission Rate (%)</Label>
                  <Input type="number" min="0" step="0.01" value={commissionRate} onChange={(e) => setCommissionRate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Low Float Alert (TZS)</Label>
                  <Input type="number" min="0" value={lowFloatThreshold} onChange={(e) => setLowFloatThreshold(e.target.value)} />
                </div>
              </div>
              {createMutation.isError && (
                <p className="text-sm text-destructive">{createMutation.error?.message}</p>
              )}
              <Button className="w-full" disabled={!name || createMutation.isPending} onClick={() => createMutation.mutate()}>
                {createMutation.isPending ? "Adding..." : "Add Provider"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : providers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            No providers configured. Add your first mobile money provider.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {providers.map((provider: {
            id: string;
            name: string;
            code: string;
            status: string;
            commissionRate: number;
            lowFloatThreshold: number;
          }) => (
            <Card key={provider.id} className={`border-2 ${PROVIDER_COLORS[provider.code] ?? ""}`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    <span className="font-bold text-sm">{provider.name}</span>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    provider.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                  }`}>
                    {provider.status}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />Commission
                    </span>
                    <span className="font-medium">{Number(provider.commissionRate).toFixed(2)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Low Float Alert</span>
                    <span className="font-medium tabular-nums text-xs">
                      {formatCurrency(provider.lowFloatThreshold)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
