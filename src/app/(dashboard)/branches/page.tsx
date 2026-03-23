"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { Plus, MapPin, Phone, Users, Wallet } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createBranchSchema, type CreateBranchInput } from "@/lib/validations/branch";

export default function BranchesPage() {
  const [newBranchOpen, setNewBranchOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: () => fetch("/api/v1/branches").then((r) => r.json()),
  });

  const branches = data?.data ?? [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateBranchInput>({
    resolver: zodResolver(createBranchSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateBranchInput) => {
      const res = await fetch("/api/v1/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setNewBranchOpen(false);
      reset();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Branches</h1>
          <p className="text-sm text-muted-foreground">
            {branches.length} branch{branches.length !== 1 ? "es" : ""}
          </p>
        </div>
        <Dialog open={newBranchOpen} onOpenChange={setNewBranchOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Add Branch
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Branch</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={handleSubmit((d) => createMutation.mutate(d))}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label>Branch Name *</Label>
                <Input placeholder="e.g. Main Branch - Kariakoo" {...register("name")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Branch Code</Label>
                  <Input placeholder="e.g. KRK-001" {...register("code")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input placeholder="0755..." {...register("phone")} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Location / Address</Label>
                <Input placeholder="e.g. Kariakoo Market, Dar es Salaam" {...register("location")} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Opening Time</Label>
                  <Input type="time" {...register("openingTime")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Closing Time</Label>
                  <Input type="time" {...register("closingTime")} />
                </div>
              </div>
              {createMutation.isError && (
                <p className="text-sm text-destructive">
                  {createMutation.error?.message}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={isSubmitting || createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Branch"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : branches.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground text-sm">
              No branches yet. Create your first branch to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {branches.map((branch: {
            id: string;
            name: string;
            code?: string;
            location?: string;
            phone?: string;
            status: string;
            _count: { tills: number; userBranches: number };
          }) => (
            <Card key={branch.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-sm">{branch.name}</h3>
                    {branch.code && (
                      <p className="text-xs text-muted-foreground font-mono">
                        {branch.code}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      branch.status === "ACTIVE"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {branch.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-sm text-muted-foreground">
                  {branch.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3" />
                      <span className="text-xs">{branch.location}</span>
                    </div>
                  )}
                  {branch.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      <span className="text-xs">{branch.phone}</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex gap-4 border-t pt-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Wallet className="h-3 w-3" />
                    {branch._count.tills} tills
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {branch._count.userBranches} staff
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
