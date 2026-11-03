"use client";

import { use, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Play,
  Pause,
  Plus,
  Users,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  MoreHorizontal,
  Trash2,
  Edit,
  Mail,
  MessageSquare,
  ArrowRight,
  Sparkles,
  Eye,
  RefreshCw,
  Download,
} from "lucide-react";
import {
  useCampaign,
  useCampaignLeads,
  useCampaignStats,
  useLeads,
  useStartCampaign,
  usePauseCampaign,
  useResumeCampaign,
  useBulkAddLeadsToCampaign,
  useUpdateCampaign,
  useSimulateReply,
} from "@/lib/api/hooks";
import { CampaignStatus, CampaignLeadStatus, CampaignUpdate, CampaignLead } from "@/lib/api/types";
import { campaignApi } from "@/lib/api/client";
import { formatDate } from "@/lib/utils";

// UI Components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: campaign, isLoading, refetch } = useCampaign(id);
  const { data: campaignLeads, refetch: refetchLeads } = useCampaignLeads(id);
  const { data: stats } = useCampaignStats(id);
  const { data: allLeads } = useLeads();

  const startCampaign = useStartCampaign();
  const pauseCampaign = usePauseCampaign();
  const resumeCampaign = useResumeCampaign();
  const bulkAddLeads = useBulkAddLeadsToCampaign();
  const updateCampaign = useUpdateCampaign();
  const simulateReply = useSimulateReply();

  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"leads" | "steps" | "add">("leads");
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [previewLead, setPreviewLead] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [simulatingLeadId, setSimulatingLeadId] = useState<string | null>(null);
  
  // Edit State
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [editingDelay, setEditingDelay] = useState(1);
  const [editingMaxFollowUps, setEditingMaxFollowUps] = useState(3);

  if (isLoading) {
    return <CampaignDetailSkeleton />;
  }

  if (!campaign) {
    return (
      <div className="p-8">
        <div className="text-center py-16">
          <p className="text-slate-500">Campaign not found</p>
          <Link href="/campaigns" className="text-indigo-600 hover:text-indigo-700 mt-2 inline-block">
            Back to Campaigns
          </Link>
        </div>
      </div>
    );
  }

  // Get leads not already in campaign
  const campaignLeadIds = new Set(campaignLeads?.map((cl) => cl.lead_id) || []);
  const availableLeads = allLeads?.filter((lead) => !campaignLeadIds.has(lead.id)) || [];

  const handleStart = async () => {
    try {
      await startCampaign.mutateAsync(id);
      toast.success("Campaign started successfully");
      refetch();
      refetchLeads();
    } catch (error) {
      toast.error("Failed to start campaign");
    }
  };

  const handlePause = async () => {
    try {
      await pauseCampaign.mutateAsync(id);
      toast.success("Campaign paused");
      refetch();
    } catch (error) {
      toast.error("Failed to pause campaign");
    }
  };

  const handleResume = async () => {
    try {
      await resumeCampaign.mutateAsync(id);
      toast.success("Campaign resumed");
      refetch();
    } catch (error) {
      toast.error("Failed to resume campaign");
    }
  };

  const handleAddLeads = async () => {
    if (selectedLeads.length === 0) return;
    try {
      await bulkAddLeads.mutateAsync({
        campaignId: id,
        data: { lead_ids: selectedLeads },
      });
      toast.success(`Added ${selectedLeads.length} leads to campaign`);
      setSelectedLeads([]);
      refetchLeads();
      setActiveTab("leads");
    } catch (error) {
      toast.error("Failed to add leads");
    }
  };

  const handleOpenEdit = () => {
    setEditingName(campaign.name);
    setEditingDescription(campaign.description || "");
    setEditingDelay(campaign.follow_up_delay_days);
    setEditingMaxFollowUps(campaign.max_follow_ups);
    setShowEditDialog(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updateData: CampaignUpdate = {
        name: editingName,
        description: editingDescription,
        follow_up_delay_days: editingDelay,
        max_follow_ups: editingMaxFollowUps,
      };

      await updateCampaign.mutateAsync({
        campaignId: id,
        data: updateData,
      });

      toast.success("Campaign updated successfully");
      setShowEditDialog(false);
      refetch();
    } catch (error) {
      toast.error("Failed to update campaign");
    }
  };

  const handleSimulateReply = async (leadId: string, leadEmail: string) => {
    try {
      setSimulatingLeadId(leadId);
      await simulateReply.mutateAsync(leadId);
      toast.success(`Simulated reply from ${leadEmail}`, {
        description: "Lead marked as replied, follow-ups stopped",
      });
      refetchLeads();
    } catch (error) {
      toast.error("Failed to simulate reply");
    } finally {
      setSimulatingLeadId(null);
    }
  };

  const handleExport = async () => {
    if (!campaign) return;
    setIsExporting(true);
    try {
      await campaignApi.exportLeadsCsv(id, campaign.name);
      toast.success("Campaign leads exported successfully");
    } catch (error) {
      toast.error("Failed to export campaign leads");
    } finally {
      setIsExporting(false);
    }
  };

  // Create a map of leads for quick lookup
  const leadsMap = new Map(allLeads?.map((l) => [l.id, l]));

  // Generate steps based on campaign config
  const generateSteps = (): Array<{
    step_number: number;
    type: "initial" | "follow_up";
    title: string;
    description: string;
    delay_days: number;
  }> => {
    const steps: Array<{
      step_number: number;
      type: "initial" | "follow_up";
      title: string;
      description: string;
      delay_days: number;
    }> = [
      {
        step_number: 1,
        type: "initial",
        title: "Initial Email",
        description: "AI-personalized introduction email",
        delay_days: 0,
      },
    ];

    // Add follow-up steps based on campaign settings
    const maxFollowUps = campaign?.max_follow_ups ?? 3;
    const delayDays = campaign?.follow_up_delay_days ?? 2;
    
    for (let i = 1; i <= maxFollowUps; i++) {
      steps.push({
        step_number: i + 1,
        type: "follow_up",
        title: `Follow-up ${i}`,
        description: `Sent after ${delayDays} days if no reply`,
        delay_days: delayDays,
      });
    }

    return steps;
  };

  const steps = generateSteps();

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/campaigns"
          className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Campaigns
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                {campaign.name}
              </h1>
              <StatusBadge status={campaign.status} />
              <Button variant="ghost" size="icon-sm" onClick={handleOpenEdit} title="Edit Campaign">
                <Edit className="w-4 h-4 text-slate-400" />
              </Button>
            </div>
            {campaign.description && (
              <p className="text-slate-500">{campaign.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={isExporting || !campaignLeads?.length}
            >
              <Download className="w-4 h-4" />
              {isExporting ? "Exporting..." : "Export"}
            </Button>
            {campaign.status === CampaignStatus.DRAFT && (
              <Button
                onClick={handleStart}
                disabled={startCampaign.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Play className="w-4 h-4 mr-1" />
                Start Campaign
              </Button>
            )}
            {campaign.status === CampaignStatus.ACTIVE && (
              <Button
                variant="secondary"
                onClick={handlePause}
                disabled={pauseCampaign.isPending}
                className="text-amber-600 border-amber-200 hover:bg-amber-50"
              >
                <Pause className="w-4 h-4 mr-1" />
                Pause
              </Button>
            )}
            {campaign.status === CampaignStatus.PAUSED && (
              <Button
                onClick={handleResume}
                disabled={resumeCampaign.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Play className="w-4 h-4 mr-1" />
                Resume
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard
          icon={<Users className="w-6 h-6 text-slate-400" />}
          value={stats?.total_leads ?? campaignLeads?.length ?? 0}
          label="Total Leads"
        />
        <StatCard
          icon={<Send className="w-6 h-6 text-blue-500" />}
          value={stats?.active ?? 0}
          label="Active"
        />
        <StatCard
          icon={<Clock className="w-6 h-6 text-amber-500" />}
          value={stats?.pending ?? 0}
          label="Pending"
        />
        <StatCard
          icon={<AlertCircle className="w-6 h-6 text-orange-500" />}
          value={stats?.bounced ?? 0}
          label="Bounced"
        />
        <StatCard
          icon={<CheckCircle className="w-6 h-6 text-emerald-500" />}
          value={stats?.replied ?? 0}
          label="Replied"
        />
      </div>

      {/* Email Performance Stats - Always visible */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Email Performance</h3>
              <p className="text-sm text-slate-500">Delivery and engagement metrics for this campaign</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-5 gap-4">
          {/* Stats Cards */}
          <div className="p-4 rounded-xl bg-slate-50">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Sent</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.emails_sent ?? 0}</p>
            <p className="text-xs text-slate-500 mt-0.5">Total emails</p>
          </div>
          <div className="p-4 rounded-xl bg-emerald-50">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Delivered</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{(stats?.emails_sent ?? 0) - (stats?.emails_bounced ?? 0)}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {stats?.emails_sent ? (((stats.emails_sent - stats.emails_bounced) / stats.emails_sent) * 100).toFixed(1) : 0}%
            </p>
          </div>
          <div className="p-4 rounded-xl bg-blue-50">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Opened</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats?.emails_opened ?? 0}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {stats?.emails_sent ? ((stats.emails_opened / stats.emails_sent) * 100).toFixed(1) : 0}%
            </p>
          </div>
          <div className="p-4 rounded-xl bg-purple-50">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Clicked</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{stats?.emails_clicked ?? 0}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {stats?.emails_sent ? ((stats.emails_clicked / stats.emails_sent) * 100).toFixed(1) : 0}%
            </p>
          </div>
         
          <div className="p-4 rounded-xl bg-red-50">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Bounced</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats?.emails_bounced ?? 0}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {stats?.emails_sent ? ((stats.emails_bounced / stats.emails_sent) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>
        
        {(!stats || stats.emails_sent === 0) && (
          <div className="mt-4 p-3 bg-slate-50 rounded-lg text-center">
            {campaign.status === CampaignStatus.DRAFT ? (
              <p className="text-sm text-slate-500">No emails sent yet. Start the campaign to begin sending emails.</p>
            ) : (
              <p className="text-sm text-slate-500">No emails recorded yet. Stats will appear as emails are processed.</p>
            )}
          </div>
        )}
      </div>

      {/* Email Sequence Steps */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Email Sequence</h3>
              <p className="text-sm text-slate-500">AI-personalized outreach flow</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-start gap-4 overflow-x-auto pb-4">
          {steps.map((step, index) => (
            <div key={step.step_number} className="flex items-start">
              <div className="flex-shrink-0 w-48">
                <div className={`p-4 rounded-xl border-2 transition-all ${
                  step.type === "initial" 
                    ? "border-indigo-500 bg-indigo-50" 
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      step.type === "initial" ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-600"
                    }`}>
                      {step.type === "initial" ? (
                        <Mail className="w-4 h-4" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </div>
                    <span className="text-xs font-medium text-slate-500">Step {step.step_number}</span>
                  </div>
                  <h4 className="font-medium text-slate-900 mb-1">{step.title}</h4>
                  <p className="text-xs text-slate-500">{step.description}</p>
                  {step.delay_days > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                      <Clock className="w-3 h-3" />
                      {step.delay_days} day wait
                    </div>
                  )}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className="flex items-center justify-center w-8 h-20 flex-shrink-0">
                  <ArrowRight className="w-5 h-5 text-slate-300" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="border-b border-slate-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab("leads")}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "leads"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Campaign Leads ({campaignLeads?.length ?? 0})
            </button>
            <button
              onClick={() => setActiveTab("steps")}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "steps"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Sequence Details
            </button>
            <button
              onClick={() => setActiveTab("add")}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "add"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              Add Leads ({availableLeads.length} available)
            </button>
          </div>
        </div>

        {/* Leads Tab */}
        {activeTab === "leads" && (
          <div>
            {campaignLeads && campaignLeads.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {campaignLeads.map((cl) => (
                  <CampaignLeadRow
                    key={cl.id}
                    campaignLead={{ ...cl, lead: leadsMap.get(cl.lead_id) }}
                    onSimulateReply={handleSimulateReply}
                    isSimulating={simulatingLeadId === cl.lead_id}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500">No leads added yet</p>
                <p className="text-sm text-slate-400 mt-1">
                  Add leads from the "Add Leads" tab
                </p>
                <Button className="mt-4" onClick={() => setActiveTab("add")}>
                  <Plus className="w-4 h-4" />
                  Add Leads
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Steps Detail Tab */}
        {activeTab === "steps" && (
          <div className="p-6">
            <div className="space-y-4">
              {steps.map((step) => (
                <div
                  key={step.step_number}
                  className="border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        step.type === "initial" ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-600"
                      }`}>
                        {step.type === "initial" ? (
                          <Mail className="w-5 h-5" />
                        ) : (
                          <RefreshCw className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">{step.title}</h4>
                        <p className="text-sm text-slate-500 mt-1">{step.description}</p>
                        {step.delay_days > 0 && (
                          <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-medium">
                            <Clock className="w-3 h-3" />
                            Sent after {step.delay_days} days
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${
                        step.type === "initial" ? "badge-active" : "badge-draft"
                      }`}>
                        {step.type === "initial" ? "Initial" : "Follow-up"}
                      </span>
                    </div>
                  </div>
                  
                  {/* Email Template Preview */}
                  <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                      <span className="text-xs font-medium text-indigo-600">AI-Generated Content</span>
                    </div>
                    <p className="text-sm text-slate-600">
                      {step.type === "initial"
                        ? "Personalized introduction based on lead's company, role, and background."
                        : "Contextual follow-up referencing previous email with new value proposition."}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* AI Info Banner */}
            <div className="mt-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-indigo-900">AI-Powered Personalization</h4>
                  <p className="text-sm text-indigo-700 mt-1">
                    Each email is automatically personalized using the lead's name, company, job title, and other 
                    profile information. The AI generates unique, relevant content for every recipient.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Leads Tab */}
        {activeTab === "add" && (
          <div className="p-6">
            {availableLeads.length > 0 ? (
              <>
                <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
                  {availableLeads.map((lead) => (
                    <label
                      key={lead.id}
                      className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(lead.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedLeads([...selectedLeads, lead.id]);
                          } else {
                            setSelectedLeads(selectedLeads.filter((id) => id !== lead.id));
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">
                          {lead.first_name
                            ? `${lead.first_name} ${lead.last_name || ""}`.trim()
                            : lead.email}
                        </p>
                        <p className="text-sm text-slate-500">{lead.email}</p>
                      </div>
                      {lead.company && (
                        <span className="text-sm text-slate-400">{lead.company}</span>
                      )}
                    </label>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                  <p className="text-sm text-slate-500">
                    {selectedLeads.length} lead{selectedLeads.length !== 1 ? "s" : ""} selected
                  </p>
                  <Button
                    onClick={handleAddLeads}
                    disabled={selectedLeads.length === 0 || bulkAddLeads.isPending}
                  >
                    <Plus className="w-4 h-4" />
                    {bulkAddLeads.isPending
                      ? "Adding..."
                      : `Add ${selectedLeads.length} Lead${selectedLeads.length !== 1 ? "s" : ""}`}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500">No available leads</p>
                <p className="text-sm text-slate-400 mt-1">
                  All your leads are already in this campaign
                </p>
                <Link href="/leads">
                  <Button className="mt-4">
                    <Plus className="w-4 h-4" />
                    Import Leads
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Campaign Info */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h3 className="font-semibold text-slate-900 mb-4">Campaign Settings</h3>
        <div className="grid grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-slate-500">Wait Duration</p>
            <p className="font-medium text-slate-900 mt-1">
              {campaign.follow_up_delay_days} days
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Max Follow-ups</p>
            <p className="font-medium text-slate-900 mt-1">
              {campaign.max_follow_ups}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Created</p>
            <p className="font-medium text-slate-900 mt-1">
              {formatDate(campaign.created_at)}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Status</p>
            <p className="font-medium text-slate-900 mt-1">
              {campaign.status}
            </p>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Name
              </label>
              <Input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <Textarea
                value={editingDescription}
                onChange={(e) => setEditingDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Wait Days
                </label>
                <Input
                  type="number"
                  min={1}
                  value={editingDelay}
                  onChange={(e) => setEditingDelay(parseInt(e.target.value) || 1)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Max Follow-ups
                </label>
                <Input
                  type="number"
                  min={0}
                  value={editingMaxFollowUps}
                  onChange={(e) => setEditingMaxFollowUps(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => setShowEditDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateCampaign.isPending}>
                {updateCampaign.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Status Badge
function StatusBadge({ status }: { status: CampaignStatus }) {
  const config: Record<CampaignStatus, { label: string; className: string }> = {
    [CampaignStatus.ACTIVE]: { label: "Active", className: "badge-active" },
    [CampaignStatus.PAUSED]: { label: "Paused", className: "badge-paused" },
    [CampaignStatus.DRAFT]: { label: "Draft", className: "badge-draft" },
    [CampaignStatus.COMPLETED]: { label: "Completed", className: "badge-active" },
    [CampaignStatus.ARCHIVED]: { label: "Archived", className: "badge-neutral" },
  };
  const { label, className } = config[status] || config[CampaignStatus.DRAFT];
  return <span className={`badge ${className}`}>{label}</span>;
}

// Campaign Lead Row with Simulate Reply
function CampaignLeadRow({
  campaignLead,
  onSimulateReply,
  isSimulating,
}: {
  campaignLead: any;
  onSimulateReply: (leadId: string, email: string) => void;
  isSimulating: boolean;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const cl = campaignLead;
  const canSimulateReply = [
    CampaignLeadStatus.PENDING,
    CampaignLeadStatus.ACTIVE,
    CampaignLeadStatus.WAITING,
  ].includes(cl.status);

  // Get email status info
  const getEmailStatusInfo = () => {
    if (cl.status === CampaignLeadStatus.REPLIED) {
      return { text: "Replied", color: "text-emerald-600", bg: "bg-emerald-50" };
    }
    if (cl.status === CampaignLeadStatus.BOUNCED) {
      return { text: "Bounced", color: "text-red-600", bg: "bg-red-50" };
    }
    if (cl.current_step === 0) {
      return { text: "Not sent", color: "text-slate-500", bg: "bg-slate-50" };
    }
    if (cl.status === CampaignLeadStatus.WAITING) {
      return { text: `Email ${cl.current_step} sent`, color: "text-blue-600", bg: "bg-blue-50" };
    }
    if (cl.status === CampaignLeadStatus.COMPLETED) {
      return { text: "Sequence complete", color: "text-purple-600", bg: "bg-purple-50" };
    }
    return { text: `Step ${cl.current_step}`, color: "text-slate-500", bg: "bg-slate-50" };
  };

  const emailStatus = getEmailStatusInfo();

  return (
    <div className="p-4 hover:bg-slate-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
            <span className="text-sm font-medium text-indigo-600">
              {cl.lead?.first_name?.[0] || cl.lead?.email?.[0] || "?"}
            </span>
          </div>
          <div>
            <p className="font-medium text-slate-900">
              {cl.lead?.first_name
                ? `${cl.lead.first_name} ${cl.lead.last_name || ""}`.trim()
                : cl.lead?.email}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm text-slate-500">{cl.lead?.email}</p>
              {cl.lead?.company && (
                <span className="text-xs text-slate-400">• {cl.lead.company}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Email Status */}
          <div className={`px-2.5 py-1 rounded-md ${emailStatus.bg}`}>
            <span className={`text-xs font-medium ${emailStatus.color}`}>
              {emailStatus.text}
            </span>
          </div>
          
          {/* Lead Status Badge */}
          <LeadStatusBadge status={cl.status} />
          
          {/* Simulate Reply Button - Visible directly */}
          {canSimulateReply && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSimulateReply(cl.lead_id, cl.lead?.email || "")}
              disabled={isSimulating}
              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300"
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1" />
              Simulate Reply
            </Button>
          )}
          
          {/* Actions Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 dropdown-menu">
                  <Link
                    href={`/leads/${cl.lead_id}`}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    onClick={() => setShowMenu(false)}
                  >
                    <Eye className="w-4 h-4" />
                    View Lead Details
                  </Link>
                  {cl.status === CampaignLeadStatus.REPLIED && cl.replied_at && (
                    <div className="px-3 py-2 text-xs text-slate-500 border-t border-slate-100">
                      Replied: {new Date(cl.replied_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Lead Status Badge
function LeadStatusBadge({ status }: { status: CampaignLeadStatus }) {
  const config: Record<CampaignLeadStatus, { label: string; className: string }> = {
    [CampaignLeadStatus.PENDING]: { label: "Pending", className: "badge-pending" },
    [CampaignLeadStatus.ACTIVE]: { label: "Active", className: "badge-active" },
    [CampaignLeadStatus.WAITING]: { label: "Waiting", className: "badge-paused" },
    [CampaignLeadStatus.NEEDS_REVIEW]: { label: "Needs Review", className: "badge-paused" },
    [CampaignLeadStatus.REPLIED]: { label: "Replied", className: "badge-replied" },
    [CampaignLeadStatus.COMPLETED]: { label: "Completed", className: "badge-active" },
    [CampaignLeadStatus.UNSUBSCRIBED]: { label: "Unsubscribed", className: "badge-stopped" },
    [CampaignLeadStatus.BOUNCED]: { label: "Bounced", className: "badge-stopped" },
    [CampaignLeadStatus.PAUSED]: { label: "Paused", className: "badge-draft" },
  };
  const { label, className } = config[status] || config[CampaignLeadStatus.PENDING];
  return <span className={`badge ${className}`}>{label}</span>;
}

// Stat Card
function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

// Loading Skeleton
function CampaignDetailSkeleton() {
  return (
    <div className="p-8 space-y-8">
      <div className="space-y-4">
        <div className="h-4 bg-slate-200 rounded w-32 skeleton" />
        <div className="h-10 bg-slate-200 rounded w-64 skeleton" />
      </div>
      <div className="grid grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 bg-slate-200 rounded-xl skeleton" />
        ))}
      </div>
      <div className="h-96 bg-slate-200 rounded-xl skeleton" />
    </div>
  );
}
