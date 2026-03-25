"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@client/components/ui/button";
import { Card, CardContent } from "@client/components/ui/card";
import { formatRelativeTime, getStatusColor } from "@/lib/utils";
import {
  AlertTriangle,
  Info,
  XCircle,
  Check,
  X,
  Bell,
} from "lucide-react";

const SEVERITY_ICONS = {
  CRITICAL: XCircle,
  WARNING: AlertTriangle,
  INFO: Info,
};

const SEVERITY_COLORS = {
  CRITICAL: "text-red-600",
  WARNING: "text-yellow-600",
  INFO: "text-blue-600",
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  LOW_CASH: "Low Cash Balance",
  LOW_FLOAT: "Low Float Balance",
  LARGE_TRANSACTION: "Large Transaction",
  DUPLICATE_REFERENCE: "Duplicate Reference",
  HIGH_REVERSALS: "High Reversal Activity",
  SHIFT_NOT_CLOSED: "Shift Not Closed",
  UNRECONCILED_DAY: "Unreconciled Day",
  SUSPICIOUS_ACTIVITY: "Suspicious Activity",
};

export default function AlertsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => fetch("/api/v1/alerts?pageSize=50").then((r) => r.json()),
    refetchInterval: 30000,
  });

  const alerts = data?.data?.data ?? [];
  const total = data?.data?.total ?? 0;

  const readMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/alerts/${id}/read`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/alerts/${id}/dismiss`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alerts</h1>
          <p className="text-sm text-muted-foreground">{total} alerts</p>
        </div>
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Auto-refreshes every 30s</span>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
          ))
        ) : alerts.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="flex flex-col items-center gap-2">
                <Bell className="h-8 w-8 text-muted-foreground" />
                <p className="text-muted-foreground text-sm">No alerts. Your system looks healthy!</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          alerts.map((alert: {
            id: string;
            type: string;
            severity: string;
            status: string;
            title: string;
            message: string;
            triggeredAt: string;
            branch?: { name: string } | null;
          }) => {
            const Icon = SEVERITY_ICONS[alert.severity as keyof typeof SEVERITY_ICONS] || Info;
            const colorClass = SEVERITY_COLORS[alert.severity as keyof typeof SEVERITY_COLORS] || "text-gray-600";

            return (
              <Card
                key={alert.id}
                className={`transition-opacity ${alert.status === "DISMISSED" ? "opacity-50" : ""}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${colorClass}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">
                            {alert.title || ALERT_TYPE_LABELS[alert.type] || alert.type}
                          </p>
                          {alert.branch && (
                            <p className="text-xs text-muted-foreground">
                              {alert.branch.name}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusColor(alert.severity)}`}
                          >
                            {alert.severity}
                          </span>
                          {alert.status === "UNREAD" && (
                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                          )}
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {alert.message}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(alert.triggeredAt)}
                        </span>
                        {alert.status !== "DISMISSED" && (
                          <div className="flex gap-2">
                            {alert.status === "UNREAD" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => readMutation.mutate(alert.id)}
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Mark read
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-muted-foreground"
                              onClick={() => dismissMutation.mutate(alert.id)}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Dismiss
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
