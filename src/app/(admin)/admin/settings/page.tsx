"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@client/components/ui/card";
import { Badge } from "@client/components/ui/badge";

export default function AdminSettingsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => fetch("/api/admin/settings").then((r) => r.json()),
  });

  const payload = data?.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Settings</h1>
        <p className="text-sm text-muted-foreground">Platform summary and recent activity</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {isLoading
          ? [...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)
          : [
              ["Organizations", payload?.stats?.organizations ?? 0],
              ["Users", payload?.stats?.users ?? 0],
              ["Branches", payload?.stats?.branches ?? 0],
              ["Transactions", payload?.stats?.transactions ?? 0],
            ].map(([label, value]) => (
              <Card key={label}>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">{label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{value}</div>
                </CardContent>
              </Card>
            ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Organizations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(payload?.recentOrganizations ?? []).map((org: { id: string; name: string; status: string; createdAt: string }) => (
              <div key={org.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{org.name}</p>
                  <p className="text-xs text-muted-foreground">{new Date(org.createdAt).toLocaleDateString()}</p>
                </div>
                <Badge variant={org.status === "ACTIVE" ? "success" : "secondary"}>{org.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Users</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(payload?.recentUsers ?? []).map((user: { id: string; name: string; email: string; role: string; createdAt: string }) => (
              <div key={user.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline">{user.role}</Badge>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
