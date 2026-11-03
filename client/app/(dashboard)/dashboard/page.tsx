"use client";

import { useState} from "react";
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
  Mail,
  Target,
  BarChart3,
} from "lucide-react";
import { Progress } from "@/app/components/ui/progress";
import { useDashboardStats, useCampaigns, useLeads, useEmailStats } from "@/lib/api/hooks";
import { formatRelativeTime } from "@/lib/utils";

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats();
  const { data: campaigns } = useCampaigns();
  const { data: emailStats } = useEmailStats();
  // const { data: leads } = useLeads();
  
  // Get current date
  const today = new Date();
  const dayName = today.toLocaleDateString("en-US", { weekday: "long" });
  const monthDay = today.toLocaleDateString("en-US", { month: "long", day: "numeric" });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Calculate stats from real data
  const totalLeads = stats?.total_leads ?? 0;
  const activeCampaigns = stats?.active_campaigns ?? 0;
  const repliedLeads = stats?.funnel_data?.replied ?? 0;
  const emailsSent = stats?.funnel_data?.emails_sent ?? 0;
  const replyRate = emailsSent > 0 ? ((repliedLeads / emailsSent) * 100).toFixed(1) : "0";
  const pendingFollowUps = activeCampaigns;

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
          <Link href="/campaigns/new" className="btn-primary">
            <Plus className="w-4 h-4" />
            New Campaign
          </Link>
        </div>
      </div>

      {/* Stats Grid - Matching Mockup */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Users className="w-5 h-5 text-indigo-600" />}
          iconBg="bg-indigo-50"
          label="TOTAL LEADS"
          value={totalLeads.toLocaleString()}
          trend={{ value: 12.5, up: true }}
        />
        <StatCard
          icon={<Mail className="w-5 h-5 text-blue-600" />}
          iconBg="bg-blue-50"
          label="EMAILS SENT"
          value={emailsSent.toLocaleString()}
          trend={{ value: 8.2, up: true }}
        />
        <StatCard
          icon={<MessageSquare className="w-5 h-5 text-emerald-600" />}
          iconBg="bg-emerald-50"
          label="REPLY RATE"
          value={replyRate}
          suffix="%"
          trend={{ value: 1.5, up: parseFloat(replyRate) > 5 }}
        />
        <StatCard
          icon={<Target className="w-5 h-5 text-amber-600" />}
          iconBg="bg-amber-50"
          label="ACTIVE CAMPAIGNS"
          value={activeCampaigns.toString()}
          trend={{ value: activeCampaigns, up: true }}
        />
      </div>

      {/* Outreach Funnel & Email Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Outreach Funnel */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Outreach Funnel</h2>
                <p className="text-sm text-slate-500">Lead conversion at a glance</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <FunnelStage
              label="Leads Added"
              value={stats?.funnel_data?.leads_added ?? totalLeads}
              percentage={100}
              color="bg-indigo-500"
            />
            <FunnelStage
              label="Emails Sent"
              value={emailsSent}
              percentage={totalLeads > 0 ? Math.round((emailsSent / totalLeads) * 100) : 0}
              color="bg-blue-500"
            />
            <FunnelStage
              label="Waiting for Reply"
              value={stats?.funnel_data?.waiting ?? 0}
              percentage={emailsSent > 0 ? Math.round(((stats?.funnel_data?.waiting ?? 0) / emailsSent) * 100) : 0}
              color="bg-amber-500"
            />
            <FunnelStage
              label="Replied"
              value={repliedLeads}
              percentage={emailsSent > 0 ? Math.round((repliedLeads / emailsSent) * 100) : 0}
              color="bg-emerald-500"
            />
          </div>
        </div>

        {/* Email Delivery Stats */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Email Performance</h2>
                <p className="text-sm text-slate-500">Delivery and engagement metrics</p>
              </div>
            </div>
          </div>
          
          {emailStats ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <EmailStatCard
                  label="Delivered"
                  value={emailStats.total}
                  rate={emailStats.delivery_rate}
                  color="text-emerald-600"
                  bgColor="bg-emerald-50"
                />
                <EmailStatCard
                  label="Opened"
                  value={emailStats.opened}
                  rate={emailStats.open_rate}
                  color="text-blue-600"
                  bgColor="bg-blue-50"
                />
                <EmailStatCard
                  label="Clicked"
                  value={emailStats.clicked}
                  rate={emailStats.click_rate}
                  color="text-purple-600"
                  bgColor="bg-purple-50"
                />
                <EmailStatCard
                  label="Bounced"
                  value={emailStats.bounced}
                  rate={emailStats.bounce_rate}
                  color="text-red-600"
                  bgColor="bg-red-50"
                />
              </div>
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Total Emails Processed</span>
                  <span className="font-semibold text-slate-900">{emailStats.total}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-400">
              <p>No email data yet</p>
            </div>
          )}
        </div>
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
          {campaigns && campaigns.length > 0 ? (
            campaigns.slice(0, 5).map((campaign) => (
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

// Stat Card Component - Matching Mockup Style
function StatCard({
  icon,
  iconBg,
  label,
  value,
  suffix = "",
  trend,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  suffix?: string;
  trend?: { value: number; up: boolean };
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
      <div className="stat-card-value">
        {value}
        {suffix && <span className="text-lg font-normal text-slate-400">{suffix}</span>}
      </div>
      <p className="text-xs font-medium text-slate-500 mt-1 tracking-wide">
        {label}
      </p>
    </div>
  );
}

// Email Stat Card Component
function EmailStatCard({
  label,
  value,
  rate,
  color,
  bgColor,
}: {
  label: string;
  value: number;
  rate: number;
  color: string;
  bgColor: string;
}) {
  return (
    <div className={`p-4 rounded-xl ${bgColor}`}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold ${color} mt-1`}>{value.toLocaleString()}</p>
      <p className="text-xs text-slate-500 mt-0.5">{rate.toFixed(1)}% rate</p>
    </div>
  );
}

// Funnel Stage Component
function FunnelStage({
  label,
  value,
  percentage,
  color,
}: {
  label: string;
  value: number;
  percentage: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-32 text-sm font-medium text-slate-600">{label}</div>
      <div className="flex-1">
        <Progress value={percentage} indicatorClassName={color} />
      </div>
      <div className="w-20 text-right">
        <span className="text-sm font-semibold text-slate-900">{value.toLocaleString()}</span>
        <span className="text-xs text-slate-400 ml-1">({percentage}%)</span>
      </div>
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

// Loading Skeleton
function DashboardSkeleton() {
  return (
    <div className="p-8 space-y-8">
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <div className="h-4 bg-slate-200 rounded w-32 skeleton" />
          <div className="h-10 bg-slate-200 rounded w-48 skeleton" />
          <div className="h-4 bg-slate-200 rounded w-64 skeleton" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 bg-slate-200 rounded w-32 skeleton" />
          <div className="h-10 bg-slate-200 rounded w-36 skeleton" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-36 bg-slate-200 rounded-xl skeleton" />
        ))}
      </div>
      <div className="h-80 bg-slate-200 rounded-xl skeleton" />
    </div>
  );
}
