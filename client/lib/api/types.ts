/**
 * API Types for Nudge Backend
 * Mirrors the FastAPI backend schemas
 */

// ============================================================================
// Enums
// ============================================================================

export enum CampaignStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  COMPLETED = "COMPLETED",
  ARCHIVED = "ARCHIVED",
}

export enum CampaignLeadStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  WAITING = "WAITING",
  NEEDS_REVIEW = "NEEDS_REVIEW",
  REPLIED = "REPLIED",
  COMPLETED = "COMPLETED",
  UNSUBSCRIBED = "UNSUBSCRIBED",
  BOUNCED = "BOUNCED",
  PAUSED = "PAUSED",
}

// ============================================================================
// User Types
// ============================================================================

export interface User {
  id: string; // Clerk ID
  email: string;
  name: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserCreate {
  id: string; // Clerk ID
  email: string;
  name?: string | null;
}

export interface UserUpdate {
  email?: string;
  name?: string | null;
}

export interface UserSettings {
  id: string;
  user_id: string;
  daily_email_limit: number;
  follow_up_delay_days: number;
  max_follow_ups: number;
  from_name: string | null;
  email_signature: string | null;
}

export interface UserSettingsUpdate {
  daily_email_limit?: number;
  follow_up_delay_days?: number;
  max_follow_ups?: number;
  from_name?: string | null;
  email_signature?: string | null;
}

// ============================================================================
// Lead Types
// ============================================================================

export interface Lead {
  id: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  company: string | null;
  job_title: string | null;
  linkedin_url: string | null;
  website: string | null;
  has_replied: boolean;
  replied_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadCreate {
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  company?: string | null;
  job_title?: string | null;
  linkedin_url?: string | null;
  website?: string | null;
}

export interface LeadUpdate {
  email?: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  company?: string | null;
  job_title?: string | null;
  linkedin_url?: string | null;
  website?: string | null;
}

export interface BulkLeadCreate {
  leads: LeadCreate[];
  skip_duplicates?: boolean;
}

// ============================================================================
// Campaign Types
// ============================================================================

export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: CampaignStatus;
  follow_up_delay_days: number;
  max_follow_ups: number;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
  paused_at: string | null;
  paused_by: string | null;
}

export interface CampaignCreate {
  name: string;
  description?: string | null;
  follow_up_delay_days?: number;
  max_follow_ups?: number;
}

export interface CampaignUpdate {
  name?: string;
  description?: string | null;
  follow_up_delay_days?: number;
  max_follow_ups?: number;
}

export interface CampaignStats {
  total_leads: number;
  pending: number;
  active: number;
  completed: number;
  replied: number;
  bounced: number;
  unsubscribed: number;
  emails_sent: number;
  emails_opened: number;
  emails_clicked: number;
  emails_bounced: number;
}

// Campaign Step Types (for email sequence visualization)
export interface CampaignStep {
  step_number: number;
  type: "initial" | "follow_up";
  delay_days: number;
  subject_template?: string;
  body_template?: string;
  emails_sent?: number;
  emails_opened?: number;
  emails_replied?: number;
}

// Simulated Reply Response
export interface SimulateReplyResponse {
  success: boolean;
  message: string;
  updated_campaigns: number;
}

export interface CampaignLead {
  id: string;
  campaign_id: string;
  lead_id: string;
  status: CampaignLeadStatus;
  current_step: number;
  enrolled_at: string;
  last_email_sent_at: string | null;
  next_email_scheduled_at: string | null;
  replied_at: string | null;
  created_at: string;
  updated_at: string;
  lead?: Lead;
}

export interface CampaignLeadCreate {
  lead_id: string;
}

export interface BulkLeadAssignment {
  lead_ids: string[];
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface DashboardStats {
  total_leads: number;
  total_campaigns: number;
  active_campaigns: number;
  emails_sent_today: number;
  daily_limit: number;
  funnel_data: {
    leads_added: number;
    emails_sent: number;
    waiting: number;
    replied: number;
  };
}

// Email Delivery Statistics
export interface EmailDeliveryStats {
  queued: number;
  sending: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  replied: number;
  bounced: number;
  failed: number;
  total: number;
  // Calculated rates
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
  reply_rate: number;
  bounce_rate: number;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

export interface BulkOperationResult {
  success_count: number;
  failure_count: number;
  errors?: Array<{ index: number; error: string }>;
}

export interface ApiError {
  detail: string;
  status_code?: number;
}
