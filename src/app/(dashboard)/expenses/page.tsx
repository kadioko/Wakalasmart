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
import { formatCurrency, formatDate, getStatusColor } from "@/lib/utils";
import { Plus, Receipt } from "lucide-react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const expenseSchema = z.object({
  branchId: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(2),
  amount: z.number().positive(),
  isCash: z.boolean().optional().default(true),
  notes: z.string().optional(),
});
type ExpenseInput = z.infer<typeof expenseSchema>;

const CATEGORIES = [
  "RENT", "UTILITIES", "AIRTIME", "TRANSPORT", "SALARIES",
  "BANK_CHARGES", "REPAIRS", "SUPPLIES", "MISCELLANEOUS",
];

export default function ExpensesPage() {
  const [newExpenseOpen, setNewExpenseOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => fetch("/api/v1/expenses?pageSize=50").then((r) => r.json()),
  });

  const { data: branchesData } = useQuery({
    queryKey: ["branches"],
    queryFn: () => fetch("/api/v1/branches").then((r) => r.json()),
  });

  const expenses = data?.data?.data ?? [];
  const total = data?.data?.total ?? 0;
  const branches = branchesData?.data ?? [];

  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } =
    useForm<ExpenseInput>({ resolver: zodResolver(expenseSchema) as unknown as Resolver<ExpenseInput> });

  const createMutation = useMutation({
    mutationFn: async (input: ExpenseInput) => {
      const res = await fetch("/api/v1/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setNewExpenseOpen(false);
      reset();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expenses</h1>
          <p className="text-sm text-muted-foreground">{total} expense records</p>
        </div>
        <Dialog open={newExpenseOpen} onOpenChange={setNewExpenseOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" />Add Expense</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Record Expense</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Branch *</Label>
                <Select onValueChange={(v) => setValue("branchId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b: { id: string; name: string }) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.branchId && <p className="text-xs text-destructive">{errors.branchId.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Select onValueChange={(v) => setValue("category", v)}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Description *</Label>
                <Input placeholder="e.g. Monthly shop rent" {...register("description")} />
                {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Amount (TZS) *</Label>
                <Input type="number" min="1" step="1" placeholder="0" {...register("amount", { valueAsNumber: true })} />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Input placeholder="Optional notes" {...register("notes")} />
              </div>
              {createMutation.isError && (
                <p className="text-sm text-destructive">{createMutation.error?.message}</p>
              )}
              <Button type="submit" className="w-full" disabled={isSubmitting || createMutation.isPending}>
                <Receipt className="h-4 w-4 mr-2" />
                {createMutation.isPending ? "Saving..." : "Record Expense"}
              </Button>
            </form>
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
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>{[...Array(7)].map((_, j) => <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>)}</TableRow>
                ))
              ) : expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No expenses recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((exp: {
                  id: string;
                  paidAt: string;
                  branch: { name: string };
                  category: string;
                  description: string;
                  amount: number;
                  status: string;
                  createdBy: { name: string };
                }) => (
                  <TableRow key={exp.id}>
                    <TableCell className="text-sm">{formatDate(exp.paidAt)}</TableCell>
                    <TableCell className="text-sm">{exp.branch?.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{exp.category.replace("_", " ")}</TableCell>
                    <TableCell className="text-sm">{exp.description}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">{formatCurrency(exp.amount)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(exp.status)}`}>
                        {exp.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{exp.createdBy?.name}</TableCell>
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
