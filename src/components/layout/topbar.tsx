"use client";

import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/lib/auth-client";
import { useQuery } from "@tanstack/react-query";

interface TopbarProps {
  onMenuClick?: () => void;
  title?: string;
}

export function Topbar({ onMenuClick, title }: TopbarProps) {
  const { data: session } = useSession();

  const { data: alertData } = useQuery({
    queryKey: ["alerts-count"],
    queryFn: async () => {
      const res = await fetch("/api/v1/alerts?status=UNREAD&pageSize=1");
      if (!res.ok) return { total: 0 };
      const json = await res.json();
      return json.data;
    },
    refetchInterval: 30000, // Check every 30s
  });

  const unreadCount = alertData?.total ?? 0;

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        {title && (
          <h1 className="text-base font-semibold md:text-lg">{title}</h1>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="relative">
          <a href="/alerts">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </a>
        </Button>

        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {session?.user?.name?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium leading-none">
              {session?.user?.name ?? "Loading..."}
            </p>
            <p className="text-xs text-muted-foreground">
              {session?.user?.email}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
