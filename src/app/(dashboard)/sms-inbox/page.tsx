"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@client/components/ui/button";
import { Input } from "@client/components/ui/input";
import { Badge } from "@client/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@client/components/ui/card";
import { Label } from "@client/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@client/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@client/components/ui/dialog";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Check, MessageSquarePlus, Save, Search, Trash2 } from "lucide-react";

const STATUS_OPTIONS = ["all", "NEW", "PARSED", "REVIEWED", "RECORDED", "FAILED", "IGNORED"];
const SOURCE_OPTIONS = ["all", "ANDROID_SYNC", "SMS_WEBHOOK", "MANUAL_INBOX"];
const PROVIDER_OPTIONS = [
  "all",
  "MPESA",
  "AIRTEL_MONEY",
  "MIXX_BY_YAS",
  "HALOPESA",
  "CRDB_BANK",
  "NMB_BANK",
  "SELCOM_PESA",
  "UNKNOWN",
];
const TRANSACTION_TYPES = [
  "DEPOSIT",
  "WITHDRAWAL",
  "FLOAT_PURCHASE",
  "TRANSFER",
  "AIRTIME_SALE",
  "BILL_PAYMENT",
  "MERCHANT_PAYMENT",
  "BANK_DEPOSIT",
  "BANK_WITHDRAWAL",
  "ADJUSTMENT",
];

const PROVIDER_LABELS: Record<string, string> = {
  MPESA: "M-Pesa",
  AIRTEL_MONEY: "Airtel Money",
  MIXX_BY_YAS: "Mixx by Yas",
  HALOPESA: "Halopesa",
  CRDB_BANK: "CRDB Bank",
  NMB_BANK: "NMB Bank",
  SELCOM_PESA: "Selcom Pesa",
  UNKNOWN: "Unknown",
};

const SOURCE_LABELS: Record<string, string> = {
  ANDROID_SYNC: "Android Sync",
  SMS_WEBHOOK: "SMS Webhook",
  MANUAL_INBOX: "Manual Inbox",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"> = {
  NEW: "secondary",
  PARSED: "info",
  REVIEWED: "warning",
  RECORDED: "success",
  FAILED: "destructive",
  IGNORED: "outline",
};

interface InboxItem {
  id: string;
  branchId?: string | null;
  source: string;
  provider: string;
  status: string;
  sender?: string | null;
  message: string;
  receivedAt: string;
  parseConfidence?: number | null;
  parseError?: string | null;
  parsedType?: string | null;
  parsedAmount?: number | null;
  parsedReference?: string | null;
  parsedExternalRef?: string | null;
  parsedCustomerPhone?: string | null;
  parsedProviderId?: string | null;
  parsedTillId?: string | null;
  reviewNotes?: string | null;
  branch?: { id: string; name: string } | null;
  transaction?: {
    id: string;
    type: string;
    amount: number;
    status: string;
    reference?: string | null;
  } | null;
}

function buildReviewForm(item: InboxItem | null) {
  return {
    branchId: item?.branchId ?? "",
    tillId: item?.parsedTillId ?? "",
    providerId: item?.parsedProviderId ?? "",
    type: item?.parsedType ?? "DEPOSIT",
    amount: item?.parsedAmount ? String(item.parsedAmount) : "",
    reference: item?.parsedReference ?? "",
    externalRef: item?.parsedExternalRef ?? "",
    customerPhone: item?.parsedCustomerPhone ?? "",
    notes: item?.reviewNotes ?? "",
  };
}

export default function SmsInboxPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [manualOpen, setManualOpen] = useState(false);
  const [selected, setSelected] = useState<InboxItem | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [manualMessage, setManualMessage] = useState("");
  const [manualSender, setManualSender] = useState("");
  const [manualBranchId, setManualBranchId] = useState("all");
  const [manualProviderHint, setManualProviderHint] = useState("UNKNOWN");
  const [reviewForm, setReviewForm] = useState({
    branchId: "",
    tillId: "",
    providerId: "",
    type: "DEPOSIT",
    amount: "",
    reference: "",
    externalRef: "",
    customerPhone: "",
    notes: "",
  });

  const { data: branchesData } = useQuery({
    queryKey: ["branches"],
    queryFn: () => fetch("/api/v1/branches").then((r) => r.json()),
  });

  const { data: providersData } = useQuery({
    queryKey: ["providers"],
    queryFn: () => fetch("/api/v1/providers").then((r) => r.json()),
  });

  const { data: tillsData } = useQuery({
    queryKey: ["tills"],
    queryFn: () => fetch("/api/v1/tills").then((r) => r.json()),
  });

  const params = new URLSearchParams({
    page: String(page),
    pageSize: "20",
    ...(statusFilter !== "all" && { status: statusFilter }),
    ...(sourceFilter !== "all" && { source: sourceFilter }),
    ...(providerFilter !== "all" && { provider: providerFilter }),
    ...(branchFilter !== "all" && { branchId: branchFilter }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["inbound-sms", params.toString()],
    queryFn: () => fetch(`/api/v1/inbound-sms?${params}`).then((r) => r.json()),
  });

  const items: InboxItem[] = data?.data?.data ?? [];
  const total = data?.data?.total ?? 0;
  const totalPages = data?.data?.totalPages ?? 1;
  const branches = branchesData?.data ?? [];
  const providers = providersData?.data ?? [];
  const tills = tillsData?.data;

  const branchScopedTills = useMemo(
    () => (tills ?? []).filter((t: { branchId: string; providerId?: string | null }) => {
      if (!reviewForm.branchId) return false;
      if (t.branchId !== reviewForm.branchId) return false;
      if (!reviewForm.providerId) return true;
      return !t.providerId || t.providerId === reviewForm.providerId;
    }),
    [tills, reviewForm.branchId, reviewForm.providerId]
  );

  const refreshInbox = () => {
    queryClient.invalidateQueries({ queryKey: ["inbound-sms"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };

  const manualMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/inbound-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "MANUAL_INBOX",
          branchId: manualBranchId !== "all" ? manualBranchId : undefined,
          sender: manualSender || undefined,
          message: manualMessage,
          providerHint: manualProviderHint !== "UNKNOWN" ? manualProviderHint : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit SMS");
      return json;
    },
    onSuccess: () => {
      setManualOpen(false);
      setManualMessage("");
      setManualSender("");
      setManualBranchId("all");
      setManualProviderHint("UNKNOWN");
      refreshInbox();
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({
      id,
      action,
      payload,
      reason,
    }: {
      id: string;
      action: "review" | "record" | "ignore";
      payload?: Record<string, unknown>;
      reason?: string;
    }) => {
      const res = await fetch(`/api/v1/inbound-sms/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload, reason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Failed to ${action} SMS`);
      return json;
    },
    onSuccess: () => {
      refreshInbox();
      setReviewOpen(false);
      setSelected(null);
    },
  });

  const submitReview = async (action: "review" | "record") => {
    if (!selected) return;
    await actionMutation.mutateAsync({
      id: selected.id,
      action,
      payload: {
        branchId: reviewForm.branchId,
        tillId: reviewForm.tillId,
        providerId: reviewForm.providerId || undefined,
        type: reviewForm.type,
        amount: Number(reviewForm.amount),
        reference: reviewForm.reference || undefined,
        externalRef: reviewForm.externalRef || undefined,
        customerPhone: reviewForm.customerPhone || undefined,
        notes: reviewForm.notes || undefined,
      },
    });
  };

  const handleIgnore = async (item: InboxItem) => {
    const reason = window.prompt("Reason for ignoring this SMS (optional):") ?? undefined;
    await actionMutation.mutateAsync({ id: item.id, action: "ignore", reason });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">SMS Inbox</h1>
          <p className="text-sm text-muted-foreground">
            Review provider and bank wakala SMS before recording transactions
          </p>
        </div>
        <Dialog open={manualOpen} onOpenChange={setManualOpen}>
          <DialogTrigger asChild>
            <Button>
              <MessageSquarePlus className="h-4 w-4" />
              Add SMS
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add SMS to Inbox</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Branch</Label>
                  <Select value={manualBranchId} onValueChange={setManualBranchId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Unassigned / decide later</SelectItem>
                      {branches.map((branch: { id: string; name: string }) => (
                        <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Provider hint</Label>
                  <Select value={manualProviderHint} onValueChange={setManualProviderHint}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDER_OPTIONS.filter((value) => value !== "all").map((value) => (
                        <SelectItem key={value} value={value}>{PROVIDER_LABELS[value] ?? value}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Sender</Label>
                <Input value={manualSender} onChange={(e) => setManualSender(e.target.value)} placeholder="e.g. M-Pesa" />
              </div>
              <div className="space-y-1.5">
                <Label>Message</Label>
                <textarea
                  className="min-h-48 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={manualMessage}
                  onChange={(e) => setManualMessage(e.target.value)}
                  placeholder="Paste the Wakala SMS here"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => void manualMutation.mutateAsync()}
                  disabled={!manualMessage.trim() || manualMutation.isPending}
                >
                  <Save className="h-4 w-4" />
                  {manualMutation.isPending ? "Saving..." : "Save to Inbox"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-5">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((value) => (
                    <SelectItem key={value} value={value}>{value === "all" ? "All statuses" : value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((value) => (
                    <SelectItem key={value} value={value}>{value === "all" ? "All sources" : SOURCE_LABELS[value] ?? value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Provider</Label>
              <Select value={providerFilter} onValueChange={setProviderFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROVIDER_OPTIONS.map((value) => (
                    <SelectItem key={value} value={value}>{value === "all" ? "All providers" : PROVIDER_LABELS[value] ?? value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Branch</Label>
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches</SelectItem>
                  {branches.map((branch: { id: string; name: string }) => (
                    <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end text-sm text-muted-foreground">
              <div className="flex items-center gap-2 rounded-md border px-3 py-2 w-full">
                <Search className="h-4 w-4" />
                {total.toLocaleString()} total messages
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inbox Queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, index) => (
                  <div key={index} className="h-24 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No SMS messages found for the current filters.
              </div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelected(item);
                    setReviewForm(buildReviewForm(item));
                    setReviewOpen(true);
                  }}
                  className="w-full rounded-lg border p-4 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={STATUS_VARIANTS[item.status] ?? "secondary"}>{item.status}</Badge>
                        <Badge variant="outline">{SOURCE_LABELS[item.source] ?? item.source}</Badge>
                        <Badge variant="outline">{PROVIDER_LABELS[item.provider] ?? item.provider}</Badge>
                      </div>
                      <p className="text-sm font-medium line-clamp-2">{item.message}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>{item.branch?.name ?? "Branch pending"}</span>
                        <span>{formatDateTime(item.receivedAt)}</span>
                        <span>Confidence: {Number(item.parseConfidence ?? 0).toFixed(2)}</span>
                        {item.sender ? <span>Sender: {item.sender}</span> : null}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{item.parsedType ?? "Type pending"}</p>
                      <p className="font-semibold text-foreground">
                        {item.parsedAmount ? formatCurrency(item.parsedAmount) : "Amount pending"}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t pt-3">
                <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Review Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {selected ? (
              <div className="space-y-4 text-sm">
                <div className="rounded-lg border p-3">
                  <p className="font-medium">Raw SMS</p>
                  <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{selected.message}</p>
                </div>
                {selected.parseError ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive text-sm">
                    {selected.parseError}
                  </div>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground">Detected type</p>
                    <p className="font-medium">{selected.parsedType ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Detected amount</p>
                    <p className="font-medium">{selected.parsedAmount ? formatCurrency(selected.parsedAmount) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Reference</p>
                    <p className="font-medium">{selected.parsedReference ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Recorded transaction</p>
                    <p className="font-medium">{selected.transaction?.reference ?? selected.transaction?.id ?? "Not recorded"}</p>
                  </div>
                </div>
                <Button className="w-full" onClick={() => {
                    setReviewForm(buildReviewForm(selected));
                    setReviewOpen(true);
                  }}>
                  Open Review Form
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Select an inbox item to review its parsed fields and record it.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Review SMS Before Recording</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4">
              <div className="rounded-lg border p-3 text-sm text-muted-foreground whitespace-pre-wrap">
                {selected.message}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Branch</Label>
                  <Select value={reviewForm.branchId} onValueChange={(value) => setReviewForm((current) => ({ ...current, branchId: value, tillId: "" }))}>
                    <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                    <SelectContent>
                      {branches.map((branch: { id: string; name: string }) => (
                        <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Provider</Label>
                  <Select value={reviewForm.providerId || "none"} onValueChange={(value) => setReviewForm((current) => ({ ...current, providerId: value === "none" ? "" : value, tillId: "" }))}>
                    <SelectTrigger><SelectValue placeholder="Optional provider" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No provider</SelectItem>
                      {providers.map((provider: { id: string; name: string }) => (
                        <SelectItem key={provider.id} value={provider.id}>{provider.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Till</Label>
                  <Select value={reviewForm.tillId} onValueChange={(value) => setReviewForm((current) => ({ ...current, tillId: value }))}>
                    <SelectTrigger><SelectValue placeholder="Select till" /></SelectTrigger>
                    <SelectContent>
                      {branchScopedTills.map((till: { id: string; name: string }) => (
                        <SelectItem key={till.id} value={till.id}>{till.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Transaction type</Label>
                  <Select value={reviewForm.type} onValueChange={(value) => setReviewForm((current) => ({ ...current, type: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TRANSACTION_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Amount</Label>
                  <Input type="number" value={reviewForm.amount} onChange={(e) => setReviewForm((current) => ({ ...current, amount: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Customer phone</Label>
                  <Input value={reviewForm.customerPhone} onChange={(e) => setReviewForm((current) => ({ ...current, customerPhone: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Reference</Label>
                  <Input value={reviewForm.reference} onChange={(e) => setReviewForm((current) => ({ ...current, reference: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>External ref</Label>
                  <Input value={reviewForm.externalRef} onChange={(e) => setReviewForm((current) => ({ ...current, externalRef: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Review notes</Label>
                <textarea
                  className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={reviewForm.notes}
                  onChange={(e) => setReviewForm((current) => ({ ...current, notes: e.target.value }))}
                />
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={() => void handleIgnore(selected)} disabled={actionMutation.isPending}>
                  <Trash2 className="h-4 w-4" />
                  Ignore
                </Button>
                <Button variant="outline" onClick={() => void submitReview("review")} disabled={actionMutation.isPending}>
                  <Check className="h-4 w-4" />
                  Save Review
                </Button>
                <Button onClick={() => void submitReview("record")} disabled={actionMutation.isPending}>
                  <Save className="h-4 w-4" />
                  Record Transaction
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
