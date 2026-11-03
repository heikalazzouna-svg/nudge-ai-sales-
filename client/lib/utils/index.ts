import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes with proper precedence
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date for display
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format a date with time
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(d);
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}

/**
 * Get initials from a name
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse CSV text into array of objects
 */
export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Campaign lead status colors and labels
 */
export const CAMPAIGN_LEAD_STATUS_CONFIG = {
  PENDING: { label: "Pending", color: "bg-slate-100 text-slate-700", dotColor: "bg-slate-400" },
  ACTIVE: { label: "Active", color: "bg-blue-100 text-blue-700", dotColor: "bg-blue-500" },
  WAITING: { label: "Waiting", color: "bg-amber-100 text-amber-700", dotColor: "bg-amber-500" },
  NEEDS_REVIEW: { label: "Needs Review", color: "bg-orange-100 text-orange-700", dotColor: "bg-orange-500" },
  REPLIED: { label: "Replied", color: "bg-green-100 text-green-700", dotColor: "bg-green-500" },
  COMPLETED: { label: "Completed", color: "bg-emerald-100 text-emerald-700", dotColor: "bg-emerald-500" },
  UNSUBSCRIBED: { label: "Unsubscribed", color: "bg-red-100 text-red-700", dotColor: "bg-red-500" },
  BOUNCED: { label: "Bounced", color: "bg-red-100 text-red-700", dotColor: "bg-red-500" },
  PAUSED: { label: "Paused", color: "bg-gray-100 text-gray-700", dotColor: "bg-gray-500" },
} as const;

/**
 * Campaign status colors and labels
 */
export const CAMPAIGN_STATUS_CONFIG = {
  DRAFT: { label: "Draft", color: "bg-slate-100 text-slate-700" },
  ACTIVE: { label: "Active", color: "bg-green-100 text-green-700" },
  PAUSED: { label: "Paused", color: "bg-amber-100 text-amber-700" },
  COMPLETED: { label: "Completed", color: "bg-blue-100 text-blue-700" },
  ARCHIVED: { label: "Archived", color: "bg-gray-100 text-gray-700" },
} as const;
