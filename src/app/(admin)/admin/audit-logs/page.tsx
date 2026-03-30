"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@client/components/ui/card";
import { Badge } from "@client/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@client/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@client/components/ui/select";

const ACTIONS = [
  "TRANSACTION_CREATED",
  "TRANSACTION_VOIDED",
  "TRANSACTION_APPROVED",
  "RECONCILIATION_SUBMITTED",
  "RECONCILIATION_APPROVED",
  "RECONCILIATION_REJECTED",
  "SHIFT_OPENED",
  "SHIFT_CLOSED",
  "USER_INVITED",
  "USER_ROLE_CHANGED",
  "USER_DEACTIVATED",
  "BRANCH_CREATED",
  "SETTINGS_CHANGED",
];

export default function AdminAuditLogsPage() {
  const [action, setAction] = useState("all");
  const params = new URLSearchParams({
    page: "1",
    pageSize: "50",
    ...(action !== "all" && { action }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-audit-logs", action],
    queryFn: () => fetch(`/api/admin/audit-logs?${params}`).then((r) => r.json()),
  });

  const logs = data?.data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Audit Logs</h1>
        <p className="text-sm text-muted-foreground">Cross-organization immutable activity log</p>
      </div>

      <div className="max-w-xs">
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger>
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {ACTIONS.map((item) => (
              <SelectItem key={item} value={item}>{item.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(6)].map((__, j) => (
                      <TableCell key={j}><div className="h-4 rounded bg-muted animate-pulse" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">No audit logs found</TableCell>
                </TableRow>
              ) : (
                logs.map((log: { id: string; createdAt: string; action: string; organization?: { name: string } | null; user?: { name: string; email: string } | null; resourceType: string; resourceId?: string | null; description: string }) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.organization?.name ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.user?.name ?? log.user?.email ?? "System"}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{log.resourceType}{log.resourceId ? `/${log.resourceId.slice(0, 8)}` : ""}</TableCell>
                    <TableCell className="max-w-sm text-sm">{log.description}</TableCell>
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
