"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@client/components/ui/card";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@client/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@client/components/ui/select";
import { Button } from "@client/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { Shield } from "lucide-react";

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("all");

  const params = new URLSearchParams({
    page: String(page),
    pageSize: "30",
    ...(action !== "all" && { action }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", params.toString()],
    queryFn: () => fetch(`/api/v1/audit?${params}`).then((r) => r.json()),
  });

  const logs = data?.data?.data ?? [];
  const total = data?.data?.total ?? 0;
  const totalPages = data?.data?.totalPages ?? 1;

  const ACTION_GROUPS = [
    "TRANSACTION_CREATED", "TRANSACTION_VOIDED", "TRANSACTION_APPROVED",
    "RECONCILIATION_SUBMITTED", "RECONCILIATION_APPROVED", "RECONCILIATION_REJECTED",
    "SHIFT_OPENED", "SHIFT_CLOSED",
    "USER_INVITED", "USER_ROLE_CHANGED", "USER_DEACTIVATED",
    "BRANCH_CREATED", "SETTINGS_CHANGED",
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">
            Immutable record of all system actions — {total.toLocaleString()} entries
          </p>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Shield className="h-4 w-4" />
          Read-only
        </div>
      </div>

      <div className="flex gap-3">
        <Select value={action} onValueChange={(v) => { setAction(v); setPage(1); }}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {ACTION_GROUPS.map((a) => (
              <SelectItem key={a} value={a}>{a.replace(/_/g, " ")}</SelectItem>
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
                <TableHead>User</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(6)].map((_, j) => (
                      <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No audit logs found
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log: {
                  id: string;
                  createdAt: string;
                  action: string;
                  user?: { name: string } | null;
                  resourceType: string;
                  resourceId?: string;
                  description: string;
                  ipAddress?: string;
                }) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono bg-muted rounded px-1.5 py-0.5">
                        {log.action}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.user?.name ?? "System"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {log.resourceType}
                      {log.resourceId && (
                        <span className="opacity-60"> /{log.resourceId.slice(0, 8)}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm max-w-xs truncate">
                      {log.description}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.ipAddress ?? "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
