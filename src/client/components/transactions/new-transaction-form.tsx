"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@client/components/ui/button";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@client/components/ui/select";
import { createTransactionSchema, type CreateTransactionInput } from "@server/validations/transaction";
import { useState } from "react";

const TRANSACTION_TYPES = [
  { value: "DEPOSIT", label: "Cash In / Deposit" },
  { value: "WITHDRAWAL", label: "Cash Out / Withdrawal" },
  { value: "FLOAT_PURCHASE", label: "Float Purchase" },
  { value: "AIRTIME_SALE", label: "Airtime Sale" },
  { value: "BILL_PAYMENT", label: "Bill Payment" },
  { value: "TRANSFER", label: "Transfer Service" },
  { value: "REVERSAL", label: "Reversal" },
  { value: "EXPENSE", label: "Expense" },
  { value: "OWNER_WITHDRAWAL", label: "Owner Withdrawal" },
  { value: "OWNER_INJECTION", label: "Owner Capital Injection" },
  { value: "BANK_DEPOSIT", label: "Bank Deposit" },
  { value: "BANK_WITHDRAWAL", label: "Bank Withdrawal" },
];

const PROVIDER_TYPES = ["DEPOSIT", "WITHDRAWAL", "FLOAT_PURCHASE", "TRANSFER", "BILL_PAYMENT", "MERCHANT_PAYMENT"];

interface NewTransactionFormProps {
  onSuccess: () => void;
}

export function NewTransactionForm({ onSuccess }: NewTransactionFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: branchesData } = useQuery({
    queryKey: ["branches"],
    queryFn: () => fetch("/api/v1/branches").then((r) => r.json()),
  });

  const branches = branchesData?.data ?? [];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateTransactionInput>({
    resolver: zodResolver(createTransactionSchema) as unknown as Resolver<CreateTransactionInput>,
    defaultValues: { fee: 0, commission: 0 },
  });

  const selectedBranchId = watch("branchId");
  const selectedType = watch("type");
  const needsProvider = selectedType && PROVIDER_TYPES.includes(selectedType);

  const { data: tillsData } = useQuery({
    queryKey: ["tills", selectedBranchId],
    queryFn: () =>
      fetch(`/api/v1/tills?branchId=${selectedBranchId}`).then((r) => r.json()),
    enabled: !!selectedBranchId,
  });

  const { data: providersData } = useQuery({
    queryKey: ["providers"],
    queryFn: () => fetch("/api/v1/providers").then((r) => r.json()),
  });

  const tills = tillsData?.data ?? [];
  const providers = providersData?.data ?? [];

  const mutation = useMutation({
    mutationFn: async (data: CreateTransactionInput) => {
      const res = await fetch("/api/v1/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to record transaction");
      }
      return res.json();
    },
    onSuccess: () => {
      setServerError(null);
      onSuccess();
    },
    onError: (error: Error) => {
      setServerError(error.message);
    },
  });

  return (
    <form
      onSubmit={handleSubmit((data) => mutation.mutate(data))}
      className="space-y-4"
    >
      {serverError && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      {/* Branch */}
      <div className="space-y-1.5">
        <Label htmlFor="branchId">Branch *</Label>
        <Select onValueChange={(v) => setValue("branchId", v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select branch" />
          </SelectTrigger>
          <SelectContent>
            {branches.map((b: { id: string; name: string }) => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.branchId && (
          <p className="text-xs text-destructive">{errors.branchId.message}</p>
        )}
      </div>

      {/* Transaction Type */}
      <div className="space-y-1.5">
        <Label htmlFor="type">Transaction Type *</Label>
        <Select onValueChange={(v) => setValue("type", v as CreateTransactionInput["type"])}>
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {TRANSACTION_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.type && (
          <p className="text-xs text-destructive">{errors.type.message}</p>
        )}
      </div>

      {/* Till */}
      <div className="space-y-1.5">
        <Label htmlFor="tillId">Till / Account *</Label>
        <Select onValueChange={(v) => setValue("tillId", v)} disabled={!selectedBranchId}>
          <SelectTrigger>
            <SelectValue placeholder={selectedBranchId ? "Select till" : "Select branch first"} />
          </SelectTrigger>
          <SelectContent>
            {tills.map((t: { id: string; name: string; type: string }) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name} ({t.type === "CASH_BOX" ? "Cash" : "Float"})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.tillId && (
          <p className="text-xs text-destructive">{errors.tillId.message}</p>
        )}
      </div>

      {/* Provider */}
      {needsProvider && (
        <div className="space-y-1.5">
          <Label htmlFor="providerId">Provider *</Label>
          <Select onValueChange={(v) => setValue("providerId", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {providers.map((p: { id: string; name: string }) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Amount */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="amount">Amount (TZS) *</Label>
          <Input
            id="amount"
            type="number"
            step="1"
            min="1"
            placeholder="0"
            {...register("amount", { valueAsNumber: true })}
          />
          {errors.amount && (
            <p className="text-xs text-destructive">{errors.amount.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="commission">Commission</Label>
          <Input
            id="commission"
            type="number"
            step="1"
            min="0"
            placeholder="0"
            {...register("commission", { valueAsNumber: true })}
          />
        </div>
      </div>

      {/* Reference */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="reference">Reference #</Label>
          <Input
            id="reference"
            placeholder="e.g. QBC123456"
            {...register("reference")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="customerPhone">Customer Phone</Label>
          <Input
            id="customerPhone"
            placeholder="0755..."
            {...register("customerPhone")}
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" placeholder="Optional notes..." {...register("notes")} />
      </div>

      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? "Recording..." : "Record Transaction"}
      </Button>
    </form>
  );
}
