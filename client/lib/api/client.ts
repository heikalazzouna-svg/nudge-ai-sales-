/**
 * API Client for Nudge Backend
 * 
 * Axios-based HTTP client with Clerk authentication integration.
 * All requests automatically include the Clerk session token.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// ============================================================================
// Core Request Function
// ============================================================================

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Make an authenticated request to the backend API.
 * Automatically injects Clerk session token.
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {} } = options;

  // Get Clerk token
  let token: string | null = null;
  
  if (typeof window !== "undefined") {
    // 1. Try to get from cookie (fastest, synchronous)
    const { getClerkIdCookie } = await import("../cookie");
    token = getClerkIdCookie();

    // 2. If no cookie, try to get from Clerk SDK (slower, async)
    if (!token) {
      const { getClerkToken } = await import("./auth");
      token = await getClerkToken();
    }
  }

  const url = `${API_BASE_URL}${endpoint}`;
  
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (token) {
    requestHeaders["X-Clerk-Id"] = token;
  }

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new ApiError(errorData.detail || "Request failed", response.status);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// ============================================================================
// API Error Class
// ============================================================================

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ============================================================================
// User API
// ============================================================================

import type {
  User,
  UserCreate,
  UserUpdate,
  UserSettings,
  UserSettingsUpdate,
} from "./types";

export const userApi = {
  create: (data: UserCreate) =>
    apiRequest<User>("/users", { method: "POST", body: data }),

  get: (userId: string) =>
    apiRequest<User>(`/users/${userId}`),

  update: (userId: string, data: UserUpdate) =>
    apiRequest<User>(`/users/${userId}`, { method: "PUT", body: data }),

  delete: (userId: string) =>
    apiRequest<void>(`/users/${userId}`, { method: "DELETE" }),

  getSettings: (userId: string) =>
    apiRequest<UserSettings>(`/users/${userId}/settings`),

  updateSettings: (userId: string, data: UserSettingsUpdate) =>
    apiRequest<UserSettings>(`/users/${userId}/settings`, { method: "PUT", body: data }),
};

// ============================================================================
// Lead API
// ============================================================================

import type {
  Lead,
  LeadCreate,
  LeadUpdate,
  BulkLeadCreate,
  BulkOperationResult,
} from "./types";

interface ListLeadsParams {
  skip?: number;
  limit?: number;
  company?: string;
  job_title?: string;
  has_replied?: boolean;
}

export const leadApi = {
  list: async (params: ListLeadsParams = {}) => {
    const searchParams = new URLSearchParams();
    if (params.skip) searchParams.set("skip", String(params.skip));
    if (params.limit) searchParams.set("limit", String(params.limit));
    if (params.company) searchParams.set("company", params.company);
    if (params.job_title) searchParams.set("job_title", params.job_title);
    if (params.has_replied !== undefined) searchParams.set("has_replied", String(params.has_replied));
    
    const query = searchParams.toString();
    const response = await apiRequest<{ leads: Lead[]; total: number }>(`/leads${query ? `?${query}` : ""}`);
    return response.leads;
  },

  get: (leadId: string) =>
    apiRequest<Lead>(`/leads/${leadId}`),

  create: (data: LeadCreate) =>
    apiRequest<Lead>("/leads", { method: "POST", body: data }),

  update: (leadId: string, data: LeadUpdate) =>
    apiRequest<Lead>(`/leads/${leadId}`, { method: "PATCH", body: data }),

  delete: (leadId: string) =>
    apiRequest<void>(`/leads/${leadId}`, { method: "DELETE" }),

  bulkCreate: (data: BulkLeadCreate) =>
    apiRequest<BulkOperationResult>("/leads/bulk", { method: "POST", body: data }),

  importCsv: async (file: File, skipDuplicates = true) => {
    const formData = new FormData();
    formData.append("file", file);
    
    // Get token for auth
    let token: string | null = null;
    if (typeof window !== "undefined") {
      const { getClerkToken } = await import("./auth");
      token = await getClerkToken();
    }

    const response = await fetch(
      `${API_BASE_URL}/leads/import?skip_duplicates=${skipDuplicates}`,
      {
        method: "POST",
        headers: token ? { "X-Clerk-Id": token } : {},
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: "Import failed" }));
      throw new ApiError(errorData.detail || "Import failed", response.status);
    }

    return response.json() as Promise<BulkOperationResult>;
  },

  exportCsv: async () => {
    // Get token for auth
    let token: string | null = null;
    if (typeof window !== "undefined") {
      const { getClerkToken } = await import("./auth");
      token = await getClerkToken();
    }

    const response = await fetch(`${API_BASE_URL}/leads/export`, {
      method: "GET",
      headers: token ? { "X-Clerk-Id": token } : {},
    });

    if (!response.ok) {
      throw new ApiError("Export failed", response.status);
    }

    // Trigger download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads_export_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  },
};

// ============================================================================
// Campaign API
// ============================================================================

import type {
  Campaign,
  CampaignCreate,
  CampaignUpdate,
  CampaignStats,
  CampaignLead,
  CampaignLeadCreate,
  BulkLeadAssignment,
  CampaignStatus,
} from "./types";

interface ListCampaignsParams {
  skip?: number;
  limit?: number;
  status?: CampaignStatus;
}

export const campaignApi = {
  list: async (params: ListCampaignsParams = {}) => {
    const searchParams = new URLSearchParams();
    if (params.skip) searchParams.set("skip", String(params.skip));
    if (params.limit) searchParams.set("limit", String(params.limit));
    if (params.status) searchParams.set("status", params.status);
    
    const query = searchParams.toString();
    const response = await apiRequest<{ campaigns: Campaign[]; total: number }>(`/campaigns${query ? `?${query}` : ""}`);
    return response.campaigns;
  },

  get: (campaignId: string) =>
    apiRequest<Campaign>(`/campaigns/${campaignId}`),

  create: (data: CampaignCreate) =>
    apiRequest<Campaign>("/campaigns", { method: "POST", body: data }),

  update: (campaignId: string, data: CampaignUpdate) =>
    apiRequest<Campaign>(`/campaigns/${campaignId}`, { method: "PATCH", body: data }),

  delete: (campaignId: string) =>
    apiRequest<void>(`/campaigns/${campaignId}`, { method: "DELETE" }),

  getStats: (campaignId: string) =>
    apiRequest<CampaignStats>(`/campaigns/${campaignId}/stats`),

  // Campaign Actions
  start: (campaignId: string) =>
    apiRequest<Campaign>(`/campaigns/${campaignId}/start`, { method: "POST" }),

  pause: (campaignId: string) =>
    apiRequest<Campaign>(`/campaigns/${campaignId}/pause`, { method: "POST" }),

  resume: (campaignId: string) =>
    apiRequest<Campaign>(`/campaigns/${campaignId}/resume`, { method: "POST" }),

  complete: (campaignId: string) =>
    apiRequest<Campaign>(`/campaigns/${campaignId}/complete`, { method: "POST" }),

  // Campaign Lead Management
  addLead: (campaignId: string, data: CampaignLeadCreate) =>
    apiRequest<CampaignLead>(`/campaigns/${campaignId}/leads`, { method: "POST", body: data }),

  bulkAddLeads: (campaignId: string, data: BulkLeadAssignment) =>
    apiRequest<BulkOperationResult>(`/campaigns/${campaignId}/leads/bulk`, { method: "POST", body: data }),

  getLeads: async (campaignId: string) => {
    const response = await apiRequest<{ campaign_leads: CampaignLead[]; total: number }>(`/campaigns/${campaignId}/leads`);
    return response.campaign_leads;
  },

  /**
   * Export campaign leads as CSV
   */
  exportLeadsCsv: async (campaignId: string, campaignName: string) => {
    // Get token for auth
    let token: string | null = null;
    if (typeof window !== "undefined") {
      const { getClerkToken } = await import("./auth");
      token = await getClerkToken();
    }

    const response = await fetch(`${API_BASE_URL}/campaigns/${campaignId}/leads`, {
      method: "GET",
      headers: token ? { "X-Clerk-Id": token } : {},
    });

    if (!response.ok) {
      throw new ApiError("Export failed", response.status);
    }

    const data = await response.json();
    const leads = data.campaign_leads || [];

    // Convert to CSV
    const headers = ["email", "first_name", "last_name", "company", "status", "current_step", "created_at"];
    const csvRows = [
      headers.join(","),
      ...leads.map((cl: any) => [
        cl.lead?.email || "",
        cl.lead?.first_name || "",
        cl.lead?.last_name || "",
        cl.lead?.company || "",
        cl.status,
        cl.current_step,
        cl.created_at,
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
    ];

    // Trigger download
    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = campaignName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    a.download = `campaign_${safeName}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  },
};

// ============================================================================
// Dashboard API
// ============================================================================

import type { DashboardStats, SimulateReplyResponse, EmailDeliveryStats } from "./types";

export const dashboardApi = {
  getStats: () =>
    apiRequest<DashboardStats>("/stats"),
  
  getEmailStats: (campaignId?: string) => {
    const query = campaignId ? `?campaign_id=${campaignId}` : "";
    return apiRequest<EmailDeliveryStats>(`/stats/emails${query}`);
  },
};

// ============================================================================
// Debug API (for testing)
// ============================================================================

export const debugApi = {
  /**
   * Simulate a reply from a lead (for testing purposes).
   * This marks the lead as replied and stops all active campaigns.
   */
  simulateReply: (leadId: string) =>
    apiRequest<SimulateReplyResponse>(`/debug/simulate-reply/${leadId}`, { method: "POST" }),
};
