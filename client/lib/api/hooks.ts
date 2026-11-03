/**
 * React Query Hooks for Nudge API
 * 
 * Provides type-safe data fetching and mutations using TanStack Query.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi, leadApi, campaignApi } from "./client";
import { useClerkId } from "./auth";
import type {
  User,
  UserCreate,
  UserUpdate,
  UserSettings,
  UserSettingsUpdate,
  Lead,
  LeadCreate,
  LeadUpdate,
  BulkLeadCreate,
  Campaign,
  CampaignCreate,
  CampaignUpdate,
  CampaignStats,
  CampaignLead,
  CampaignLeadCreate,
  BulkLeadAssignment,
  CampaignStatus,
  DashboardStats,
  SimulateReplyResponse,
  EmailDeliveryStats,
} from "./types";

// ============================================================================
// Query Keys
// ============================================================================

export const queryKeys = {
  user: (userId: string) => ["user", userId] as const,
  userSettings: (userId: string) => ["user", userId, "settings"] as const,
  leads: (params?: object) => ["leads", params] as const,
  lead: (leadId: string) => ["leads", leadId] as const,
  campaigns: (params?: object) => ["campaigns", params] as const,
  campaign: (campaignId: string) => ["campaigns", campaignId] as const,
  campaignStats: (campaignId: string) => ["campaigns", campaignId, "stats"] as const,
  campaignLeads: (campaignId: string) => ["campaigns", campaignId, "leads"] as const,
  dashboardStats: () => ["dashboard", "stats"] as const,
};

// ============================================================================
// User Hooks
// ============================================================================

export function useUser() {
  const userId = useClerkId();
  
  return useQuery({
    queryKey: queryKeys.user(userId ?? ""),
    queryFn: () => userApi.get(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: UserCreate) => userApi.create(data),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.user(user.id), user);
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  const userId = useClerkId();
  
  return useMutation({
    mutationFn: (data: UserUpdate) => userApi.update(userId!, data),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.user(user.id), user);
    },
  });
}

export function useUserSettings() {
  const userId = useClerkId();
  
  return useQuery({
    queryKey: queryKeys.userSettings(userId ?? ""),
    queryFn: () => userApi.getSettings(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateUserSettings() {
  const queryClient = useQueryClient();
  const userId = useClerkId();
  
  return useMutation({
    mutationFn: (data: UserSettingsUpdate) => userApi.updateSettings(userId!, data),
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKeys.userSettings(userId!), settings);
    },
  });
}

// ============================================================================
// Lead Hooks
// ============================================================================

interface UseLeadsParams {
  skip?: number;
  limit?: number;
  company?: string;
  job_title?: string;
  has_replied?: boolean;
}

export function useLeads(params: UseLeadsParams = {}) {
  const userId = useClerkId();
  
  return useQuery({
    queryKey: queryKeys.leads(params),
    queryFn: () => leadApi.list(params),
    enabled: !!userId, // Only fetch when authenticated
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
  });
}

export function useLead(leadId: string) {
  const userId = useClerkId();
  
  return useQuery({
    queryKey: queryKeys.lead(leadId),
    queryFn: () => leadApi.get(leadId),
    enabled: !!leadId && !!userId, // Only fetch when authenticated
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: LeadCreate) => leadApi.create(data),
    onMutate: async (newLead) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["leads"] });
      
      // Snapshot previous value
      const previousLeads = queryClient.getQueryData<Lead[]>(queryKeys.leads({}));
      
      // Optimistically update
      if (previousLeads) {
        const optimisticLead: Lead = {
          id: `temp-${Date.now()}`,
          user_id: "",
          email: newLead.email,
          first_name: newLead.first_name ?? null,
          last_name: newLead.last_name ?? null,
          full_name: newLead.full_name ?? null,
          company: newLead.company ?? null,
          job_title: newLead.job_title ?? null,
          linkedin_url: newLead.linkedin_url ?? null,
          website: newLead.website ?? null,
          has_replied: false,
          replied_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        queryClient.setQueryData<Lead[]>(queryKeys.leads({}), [optimisticLead, ...previousLeads]);
      }
      
      return { previousLeads };
    },
    onError: (_err, _newLead, context) => {
      // Rollback on error
      if (context?.previousLeads) {
        queryClient.setQueryData(queryKeys.leads({}), context.previousLeads);
      }
    },
    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ leadId, data }: { leadId: string; data: LeadUpdate }) =>
      leadApi.update(leadId, data),
    onMutate: async ({ leadId, data }) => {
      await queryClient.cancelQueries({ queryKey: ["leads"] });
      
      const previousLeads = queryClient.getQueryData<Lead[]>(queryKeys.leads({}));
      
      // Optimistically update the lead in the list
      if (previousLeads) {
        queryClient.setQueryData<Lead[]>(
          queryKeys.leads({}),
          previousLeads.map((lead) =>
            lead.id === leadId ? { ...lead, ...data, updated_at: new Date().toISOString() } : lead
          )
        );
      }
      
      return { previousLeads };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousLeads) {
        queryClient.setQueryData(queryKeys.leads({}), context.previousLeads);
      }
    },
    onSettled: (_data, _error, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.lead(leadId) });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (leadId: string) => leadApi.delete(leadId),
    onMutate: async (leadId) => {
      await queryClient.cancelQueries({ queryKey: ["leads"] });
      
      const previousLeads = queryClient.getQueryData<Lead[]>(queryKeys.leads({}));
      
      // Optimistically remove the lead
      if (previousLeads) {
        queryClient.setQueryData<Lead[]>(
          queryKeys.leads({}),
          previousLeads.filter((lead) => lead.id !== leadId)
        );
      }
      
      return { previousLeads };
    },
    onError: (_err, _leadId, context) => {
      if (context?.previousLeads) {
        queryClient.setQueryData(queryKeys.leads({}), context.previousLeads);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useBulkCreateLeads() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: BulkLeadCreate) => leadApi.bulkCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export function useImportLeadsCsv() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ file, skipDuplicates }: { file: File; skipDuplicates?: boolean }) =>
      leadApi.importCsv(file, skipDuplicates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

// ============================================================================
// Campaign Hooks
// ============================================================================

interface UseCampaignsParams {
  skip?: number;
  limit?: number;
  status?: CampaignStatus;
}

export function useCampaigns(params: UseCampaignsParams = {}) {
  const userId = useClerkId();
  
  return useQuery({
    queryKey: queryKeys.campaigns(params),
    queryFn: () => campaignApi.list(params),
    enabled: !!userId, // Only fetch when authenticated
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
  });
}

export function useCampaign(campaignId: string) {
  return useQuery({
    queryKey: queryKeys.campaign(campaignId),
    queryFn: () => campaignApi.get(campaignId),
    enabled: !!campaignId,
  });
}

export function useCampaignStats(campaignId: string) {
  return useQuery({
    queryKey: queryKeys.campaignStats(campaignId),
    queryFn: () => campaignApi.getStats(campaignId),
    enabled: !!campaignId,
    staleTime: 30 * 1000, // 30 seconds - more real-time for stats
    gcTime: 2 * 60 * 1000, // 2 minutes garbage collection
    refetchInterval: 60 * 1000, // Auto-refresh every minute when tab is focused
  });
}

export function useCampaignLeads(campaignId: string) {
  return useQuery({
    queryKey: queryKeys.campaignLeads(campaignId),
    queryFn: () => campaignApi.getLeads(campaignId),
    enabled: !!campaignId,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CampaignCreate) => campaignApi.create(data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ campaignId, data }: { campaignId: string; data: CampaignUpdate }) =>
      campaignApi.update(campaignId, data),
    onSuccess: (campaign) => {
      queryClient.setQueryData(queryKeys.campaign(campaign.id), campaign);
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (campaignId: string) => campaignApi.delete(campaignId),
    onMutate: async (campaignId) => {
      await queryClient.cancelQueries({ queryKey: ["campaigns"] });
      
      const previousCampaigns = queryClient.getQueryData<Campaign[]>(queryKeys.campaigns({}));
      
      // Optimistically remove the campaign
      if (previousCampaigns) {
        queryClient.setQueryData<Campaign[]>(
          queryKeys.campaigns({}),
          previousCampaigns.filter((c) => c.id !== campaignId)
        );
      }
      
      return { previousCampaigns };
    },
    onError: (_err, _campaignId, context) => {
      if (context?.previousCampaigns) {
        queryClient.setQueryData(queryKeys.campaigns({}), context.previousCampaigns);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// Campaign Actions
export function useStartCampaign() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (campaignId: string) => campaignApi.start(campaignId),
    onSuccess: (campaign) => {
      queryClient.setQueryData(queryKeys.campaign(campaign.id), campaign);
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

export function usePauseCampaign() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (campaignId: string) => campaignApi.pause(campaignId),
    onSuccess: (campaign) => {
      queryClient.setQueryData(queryKeys.campaign(campaign.id), campaign);
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

export function useResumeCampaign() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (campaignId: string) => campaignApi.resume(campaignId),
    onSuccess: (campaign) => {
      queryClient.setQueryData(queryKeys.campaign(campaign.id), campaign);
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

export function useCompleteCampaign() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (campaignId: string) => campaignApi.complete(campaignId),
    onSuccess: (campaign) => {
      queryClient.setQueryData(queryKeys.campaign(campaign.id), campaign);
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}

// Campaign Lead Management
export function useAddLeadToCampaign() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ campaignId, data }: { campaignId: string; data: CampaignLeadCreate }) =>
      campaignApi.addLead(campaignId, data),
    onSuccess: (_, { campaignId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaignLeads(campaignId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.campaignStats(campaignId) });
    },
  });
}

export function useBulkAddLeadsToCampaign() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ campaignId, data }: { campaignId: string; data: BulkLeadAssignment }) =>
      campaignApi.bulkAddLeads(campaignId, data),
    onSuccess: (_, { campaignId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaignLeads(campaignId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.campaignStats(campaignId) });
    },
  });
}

// ============================================================================
// Dashboard Hooks
// ============================================================================

import { dashboardApi, debugApi } from "./client";

/**
 * Fetch dashboard statistics from the backend.
 * Returns real-time aggregated stats including funnel data.
 */
export function useDashboardStats() {
  const userId = useClerkId();
  
  return useQuery<DashboardStats>({
    queryKey: queryKeys.dashboardStats(),
    queryFn: () => dashboardApi.getStats(),
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute - increased for better caching
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
  });
}

/**
 * Fetch email delivery statistics.
 * Can be filtered by campaign ID for campaign-specific stats.
 */
export function useEmailStats(campaignId?: string) {
  const userId = useClerkId();
  
  return useQuery<EmailDeliveryStats>({
    queryKey: ["email-stats", campaignId],
    queryFn: () => dashboardApi.getEmailStats(campaignId),
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds - more real-time for email stats
    gcTime: 2 * 60 * 1000, // 2 minutes garbage collection
  });
}

// ============================================================================
// Debug Hooks (for testing)
// ============================================================================

/**
 * Simulate a reply from a lead (for testing).
 * Marks the lead as replied and stops all active campaign sequences.
 */
export function useSimulateReply() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (leadId: string) => debugApi.simulateReply(leadId),
    onSuccess: () => {
      // Invalidate all related queries for instant UI update
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["email-stats"] });
    },
  });
}

