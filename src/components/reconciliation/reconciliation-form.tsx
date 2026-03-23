"use client";

import { useState } from "react";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createReconciliationSchema,
  type CreateReconciliationInput,
} from "@/lib/validations/reconciliation";
import { formatCurrency } from "@/lib/utils";

interface ReconciliationFormProps {
  onSuccess: () => void;
}

export function ReconciliationForm({ onSuccess }: ReconciliationFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: branchesData } = useQuery({
    queryKey: ["branches"],
    queryFn: () => fetch("/api/v1/branches").then((r) => r.json()),
  });

  const { data: providersData } = useQuery({
    queryKey: ["providers"],
    queryFn: () => fetch("/api/v1/providers").then((r) => r.json()),
  });

  const branches = branchesData?.data ?? [];
  const providers = (providersData?.data ?? []).filter((p: { status: string }) => p.status === "ACTIVE");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<CreateReconciliationInput>({
    resolver: zodResolver(createReconciliationSchema) as unknown as Resolver<CreateReconciliationInput>,
    defaultValues: {
      date: new Date(),
      actualCash: 0,
      floatItems: providers.map((p: { id: string }) => ({
        providerId: p.id,
        actualFloat: 0,
      })),
    },
  });

  const { fields } = useFieldArray({ control, name: "floatItems" });

  const mutation = useMutation({
    mutationFn: async (data: CreateReconciliationInput) => {
      const res = await fetch("/api/v1/reconciliation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create reconciliation");
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
      className="space-y-6"
    >
      {serverError && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Branch */}
        <div className="space-y-1.5">
          <Label>Branch *</Label>
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

        {/* Date */}
        <div className="space-y-1.5">
          <Label>Date *</Label>
          <Input
            type="date"
            defaultValue={new Date().toISOString().split("T")[0]}
            {...register("date")}
          />
        </div>
      </div>

      {/* Cash Section */}
      <div className="rounded-lg border p-4 space-y-3">
        <h3 className="font-semibold text-sm">Cash Reconciliation</h3>
        <div className="space-y-1.5">
          <Label>Actual Cash Count (TZS) *</Label>
          <Input
            type="number"
            step="1"
            min="0"
            placeholder="Enter counted cash amount"
            {...register("actualCash", { valueAsNumber: true })}
          />
          {errors.actualCash && (
            <p className="text-xs text-destructive">{errors.actualCash.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Count the actual cash in the till and enter the total here.
          </p>
        </div>
      </div>

      {/* Float Section */}
      {providers.length > 0 && (
        <div className="rounded-lg border p-4 space-y-3">
          <h3 className="font-semibold text-sm">Float Reconciliation by Provider</h3>
          <div className="space-y-3">
            {providers.map((provider: { id: string; name: string; code: string }, idx: number) => (
              <div key={provider.id} className="flex items-center gap-3">
                <div className="w-28">
                  <p className="text-sm font-medium">{provider.name}</p>
                  <p className="text-xs text-muted-foreground">{provider.code}</p>
                </div>
                <div className="flex-1 space-y-1">
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    placeholder={`${provider.name} float balance`}
                    {...register(`floatItems.${idx}.actualFloat`, {
                      valueAsNumber: true,
                    })}
                  />
                  <input
                    type="hidden"
                    value={provider.id}
                    {...register(`floatItems.${idx}.providerId`)}
                  />
                </div>
                <div className="w-40">
                  <Input
                    placeholder="Variance notes"
                    {...register(`floatItems.${idx}.varianceNotes`)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-1.5">
        <Label>Notes / Explanation</Label>
        <Input
          placeholder="Any notes about variances or issues..."
          {...register("notes")}
        />
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={mutation.isPending}
      >
        {mutation.isPending ? "Saving..." : "Save Reconciliation"}
      </Button>
    </form>
  );
}
