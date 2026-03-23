import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number | string | { toString(): string },
  currency = "TZS"
): string {
  const num = typeof amount === "number" ? amount : parseFloat(amount.toString());
  if (isNaN(num)) return `${currency} 0`;

  return new Intl.NumberFormat("en-TZ", {
    style: "currency",
    currency: currency === "TZS" ? "TZS" : currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(num)
    .replace("TZS", "TZS ");
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-TZ").format(num);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-TZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-TZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function generateBranchCode(name: string, index: number): string {
  const prefix = name.substring(0, 3).toUpperCase();
  return `${prefix}-${String(index).padStart(3, "0")}`;
}

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone;
  return `${phone.substring(0, 4)}****${phone.substring(phone.length - 3)}`;
}

export function isVarianceSignificant(variance: number, threshold = 1000): boolean {
  return Math.abs(variance) > threshold;
}

export function getVarianceClass(variance: number): string {
  if (variance === 0) return "text-green-600";
  if (variance > 0) return "text-blue-600";
  return "text-red-600";
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-800",
    INACTIVE: "bg-gray-100 text-gray-800",
    PENDING: "bg-yellow-100 text-yellow-800",
    COMPLETED: "bg-green-100 text-green-800",
    VOIDED: "bg-red-100 text-red-800",
    DISPUTED: "bg-orange-100 text-orange-800",
    REQUIRES_APPROVAL: "bg-yellow-100 text-yellow-800",
    OPEN: "bg-blue-100 text-blue-800",
    CLOSED: "bg-gray-100 text-gray-800",
    APPROVED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
    SUBMITTED: "bg-purple-100 text-purple-800",
    DRAFT: "bg-gray-100 text-gray-800",
    SUSPENDED: "bg-red-100 text-red-800",
    TRIAL: "bg-yellow-100 text-yellow-800",
    UNREAD: "bg-blue-100 text-blue-800",
    READ: "bg-gray-100 text-gray-800",
    DISMISSED: "bg-gray-50 text-gray-500",
    CRITICAL: "bg-red-100 text-red-800",
    WARNING: "bg-yellow-100 text-yellow-800",
    INFO: "bg-blue-100 text-blue-800",
  };
  return colors[status] ?? "bg-gray-100 text-gray-800";
}
