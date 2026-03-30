"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@client/components/ui/card";
import { Badge } from "@client/components/ui/badge";
import { AlertTriangle } from "lucide-react";

export default function AdminAlertsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-alerts"],
    queryFn: () => fetch("/api/admin/alerts?pageSize=50").then((r) => r.json()),
  });

  const alerts = data?.data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">System Alerts</h1>
        <p className="text-sm text-muted-foreground">Platform-wide operational alerts</p>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          [...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)
        ) : alerts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">No system alerts found</CardContent>
          </Card>
        ) : (
          alerts.map((alert: { id: string; title: string; message: string; severity: string; status: string; organization?: { name: string } | null; branch?: { name: string } | null; triggeredAt: string }) => (
            <Card key={alert.id}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {alert.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{alert.severity}</Badge>
                  <Badge variant={alert.status === "UNREAD" ? "warning" : "secondary"}>{alert.status}</Badge>
                  {alert.organization?.name ? <Badge variant="info">{alert.organization.name}</Badge> : null}
                  {alert.branch?.name ? <Badge variant="secondary">{alert.branch.name}</Badge> : null}
                </div>
                <p className="text-sm text-muted-foreground">{alert.message}</p>
                <p className="text-xs text-muted-foreground">{new Date(alert.triggeredAt).toLocaleString()}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
