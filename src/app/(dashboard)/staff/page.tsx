"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatDateTime } from "@/lib/utils";
import { Plus, Mail, UserCheck } from "lucide-react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { inviteStaffSchema, type InviteStaffInput } from "@/lib/validations/auth";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  BRANCH_MANAGER: "Branch Manager",
  CASHIER: "Cashier",
  ACCOUNTANT: "Accountant",
};

export default function StaffPage() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [latestInviteUrl, setLatestInviteUrl] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["staff"],
    queryFn: () => fetch("/api/v1/staff").then((r) => r.json()),
  });

  const { data: branchesData } = useQuery({
    queryKey: ["branches"],
    queryFn: () => fetch("/api/v1/branches").then((r) => r.json()),
  });

  const staff = data?.data ?? [];
  const branches = branchesData?.data ?? [];

  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } =
    useForm<InviteStaffInput>({
      resolver: zodResolver(inviteStaffSchema) as unknown as Resolver<InviteStaffInput>,
    });

  const inviteMutation = useMutation({
    mutationFn: async (input: InviteStaffInput) => {
      const res = await fetch("/api/v1/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      return res.json();
    },
    onSuccess: (response: { data?: { acceptUrl?: string } }) => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setInviteOpen(false);
      reset();
      setSelectedBranches([]);
      setLatestInviteUrl(response.data?.acceptUrl || null);
    },
  });

  const toggleBranch = (id: string) => {
    const updated = selectedBranches.includes(id)
      ? selectedBranches.filter((b: string) => b !== id)
      : [...selectedBranches, id];
    setSelectedBranches(updated);
    setValue("branchIds", updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Staff</h1>
          <p className="text-sm text-muted-foreground">{staff.length} team members</p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Invite Staff
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit((d: InviteStaffInput) => inviteMutation.mutate(d))} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Email Address *</Label>
                <Input type="email" placeholder="staff@example.com" {...register("email")} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Role *</Label>
                <Select onValueChange={(v: string) => setValue("role", v as InviteStaffInput["role"])}>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRANCH_MANAGER">Branch Manager</SelectItem>
                    <SelectItem value="CASHIER">Cashier</SelectItem>
                    <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Assign Branches *</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto rounded-lg border p-2">
                  {branches.map((b: { id: string; name: string }) => (
                    <label key={b.id} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={selectedBranches.includes(b.id)}
                        onChange={() => toggleBranch(b.id)}
                      />
                      {b.name}
                    </label>
                  ))}
                </div>
                {errors.branchIds && (
                  <p className="text-xs text-destructive">{errors.branchIds.message}</p>
                )}
              </div>
              {inviteMutation.isError && (
                <p className="text-sm text-destructive">{inviteMutation.error?.message}</p>
              )}
              <Button type="submit" className="w-full" disabled={isSubmitting || inviteMutation.isPending}>
                <Mail className="h-4 w-4 mr-2" />
                {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {latestInviteUrl && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <UserCheck className="h-4 w-4 text-green-600" />
              Invitation created successfully
            </div>
            <p className="text-sm text-muted-foreground">
              Share this link with the invited staff member until email delivery is connected.
            </p>
            <div className="rounded-lg border bg-muted/30 p-3 text-xs break-all">
              {latestInviteUrl}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigator.clipboard.writeText(latestInviteUrl)}
              >
                Copy Link
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setLatestInviteUrl(null)}
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Branches</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(6)].map((_, j) => (
                      <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : staff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No staff yet. Invite your first team member.
                  </TableCell>
                </TableRow>
              ) : (
                staff.map((user: {
                  id: string;
                  name: string;
                  email: string;
                  role: string;
                  isActive: boolean;
                  lastLoginAt?: string;
                  userBranches: { branch: { name: string } }[];
                }) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <span className="text-sm">{ROLE_LABELS[user.role] ?? user.role}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.userBranches.map((ub) => ub.branch.name).join(", ") || "—"}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                      }`}>
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never"}
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
