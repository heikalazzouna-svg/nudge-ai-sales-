"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  TrendingUp, 
  TrendingDown,
  Users,
  Send,
  MessageSquare,
  Clock,
  Plus,
  Download,
  Activity,
  Zap,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import { useDashboardStats, useCampaigns } from "@/lib/api/hooks";
import { leadApi } from "@/lib/api/client";
import { formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";
import { Skeleton } from "@/app/components/ui/skeleton";

export default function DashboardPage() {
  const { data: stats, isLoading: isLoadingStats } = useDashboardStats();
  // Only fetch the 5 most recent campaigns for the feed
  const { data: campaigns, isLoading: isLoadingCampaigns } = useCampaigns({ limit: 5 });
  const [isExporting, setIsExporting] = useState(false);
  
  // Handle export report
  const handleExport = async () => {
    setIsExporting(true);
    try {
      await leadApi.exportCsv();
      toast.success("Report exported successfully");
    } catch (error) {
      toast.error("Failed to export report");
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };
  
  // Get current date
  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
  const monthDay = today.toLocaleDateString("en-US", { month: "long", day: "numeric" });

  // Calculated stats from backend data
  const totalLeads = stats?.total_leads ?? 0;
  const emailsSent = stats?.funnel_data?.emails_sent ?? 0;
  const replied = stats?.funnel_data?.replied ?? 0;
  const replyRate = emailsSent > 0 ? ((replied / emailsSent) * 100).toFixed(1) : "0";
  const pendingFollowUps = stats?.active_campaigns ?? 0;

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          {/* System Status */}
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-medium text-emerald-600">
              System Operational
            </span>
          </div>
          
          {/* Welcome Message */}
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
            Welcome<br />back
          </h1>
          <p className="text-slate-500 mt-2">
            Here's what's happening on{" "}
            <span className="text-indigo-600 font-medium">{dayName}, {monthDay}</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button 
            className="btn-secondary"
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download className="w-4 h-4" />
            {isExporting ? "Exporting..." : "Export Report"}
          </button>
          <Link href="/campaigns/new" className="btn-primary">
            <Plus className="w-4 h-4" />
            New Campaign
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Users className="w-5 h-5 text-indigo-600" />}
          iconBg="bg-indigo-50"
          label="TOTAL LEADS"
          value={totalLeads.toLocaleString()}
          isLoading={isLoadingStats}
          trend={{ value: 12.5, up: true }}
        />
        <StatCard
          icon={<Send className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-50"
          label="EMAILS SENT"
          value={emailsSent.toLocaleString()}
          isLoading={isLoadingStats}
          trend={{ value: 8.2, up: false }}
        />
        <StatCard
          icon={<MessageSquare className="w-5 h-5 text-emerald-600" />}
          iconBg="bg-emerald-50"
          label="REPLY RATE"
          value={`${replyRate}`}
          suffix="%"
          isLoading={isLoadingStats}
          trend={{ value: 1.5, up: false }}
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-amber-600" />}
          iconBg="bg-amber-50"
          label="ACTIVE CAMPAIGNS"
          value={pendingFollowUps.toString()}
          isLoading={isLoadingStats}
          trend={{ value: 5, up: true }}
        />
      </div>

      {/* Live Intelligence Feed */}
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Zap className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Live Intelligence Feed
              </h2>
              <p className="text-sm text-slate-500">Real-time outreach updates</p>
            </div>
          </div>
          <Link
            href="/campaigns"
            className="text-sm text-slate-500 hover:text-indigo-600 font-medium flex items-center gap-1"
          >
            View All
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        <div className="divide-y divide-slate-100">
          {isLoadingCampaigns ? (
            // Skeleton for feed items
            [1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))
          ) : campaigns && campaigns.length > 0 ? (
            campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Send className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    {campaign.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {campaign.status} • {campaign.follow_up_delay_days} day follow-up
                  </p>
                </div>
                <span className="text-xs text-slate-400">
                  {formatRelativeTime(campaign.created_at)}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500">No campaigns yet</p>
              <p className="text-sm text-slate-400 mt-1">
                Create your first campaign to see activity here
              </p>
              <Link
                href="/campaigns/new"
                className="inline-flex items-center gap-2 mt-4 text-sm text-indigo-600 font-medium hover:text-indigo-700"
              >
                <Plus className="w-4 h-4" />
                Create Campaign
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickActionCard
          icon={<Users className="w-6 h-6" />}
          title="Import Leads"
          description="Upload a CSV file to add leads"
          href="/leads"
        />
        <QuickActionCard
          icon={<Send className="w-6 h-6" />}
          title="Create Campaign"
          description="Start a new outreach sequence"
          href="/campaigns/new"
        />
        <QuickActionCard
          icon={<CheckCircle className="w-6 h-6" />}
          title="View Reports"
          description="Check campaign performance"
          href="/campaigns"
        />
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  icon,
  iconBg,
  label,
  value,
  suffix = "",
  trend,
  isLoading,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  suffix?: string;
  trend?: { value: number; up: boolean };
  isLoading?: boolean;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between mb-4">
        <div className={`stat-card-icon ${iconBg}`}>{icon}</div>
        {trend && (
          <div
            className={`stat-card-trend ${trend.up ? "up" : "down"}`}
          >
            {trend.up ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {trend.value}%
          </div>
        )}
      </div>
      <div className="stat-card-value min-h-[32px]">
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <>
            {value}
            {suffix && <span className="text-lg font-normal text-slate-400">{suffix}</span>}
          </>
        )}
      </div>
      <p className="text-xs font-medium text-slate-500 mt-1 tracking-wide">
        {label}
      </p>
    </div>
  );
}

// Quick Action Card Component
function QuickActionCard({
  icon,
  title,
  description,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group bg-white border border-slate-200 rounded-xl p-6 hover:border-indigo-300 hover:shadow-md transition-all"
    >
      <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center mb-4 text-slate-600 group-hover:text-indigo-600 transition-colors">
        {icon}
      </div>
      <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
        {title}
      </h3>
      <p className="text-sm text-slate-500 mt-1">{description}</p>
    </Link>
  );
}
