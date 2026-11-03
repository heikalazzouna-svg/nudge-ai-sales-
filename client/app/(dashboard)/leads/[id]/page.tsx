"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Mail,
  Building,
  Briefcase,
  Globe,
  Linkedin,
  Calendar,
  CheckCircle,
  Send,
  Trash2,
  ExternalLink,
  User,
  Activity,
  X,
} from "lucide-react";
import { useLead, useDeleteLead } from "@/lib/api/hooks";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { ConfirmDialog } from "@/app/components/ui/confirm-dialog";

export default function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: lead, isLoading } = useLead(id);
  const deleteLead = useDeleteLead();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-4 bg-slate-200 rounded w-32 skeleton" />
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-200 skeleton" />
            <div className="space-y-2">
              <div className="h-8 bg-slate-200 rounded w-48 skeleton" />
              <div className="h-4 bg-slate-200 rounded w-32 skeleton" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div className="h-40 bg-slate-200 rounded-xl skeleton" />
            <div className="h-40 bg-slate-200 rounded-xl skeleton" />
            <div className="h-40 bg-slate-200 rounded-xl skeleton" />
          </div>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-8">
        <div className="text-center py-16">
          <p className="text-slate-500">Lead not found</p>
          <Link
            href="/leads"
            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mt-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Leads
          </Link>
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    try {
      await deleteLead.mutateAsync(id);
      toast.success("Lead deleted");
      router.push("/leads");
    } catch (error) {
      toast.error("Failed to delete lead");
    }
  };

  const fullName = lead.first_name || lead.last_name
    ? `${lead.first_name || ""} ${lead.last_name || ""}`.trim()
    : lead.email;

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/leads"
          className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Leads
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg">
              <span className="text-2xl font-bold text-white">
                {(lead.first_name?.[0] || lead.email[0]).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-slate-900">{fullName}</h1>
                {lead.has_replied && (
                  <span className="badge badge-replied">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Replied
                  </span>
                )}
              </div>
              <p className="text-slate-500">{lead.email}</p>
              {lead.company && (
                <p className="text-sm text-slate-400 mt-1">
                  {lead.job_title && `${lead.job_title} at `}
                  {lead.company}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowDeleteDialog(true)}
            className="btn-secondary text-red-600 border-red-200 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact Info */}
        <div className="bg-white border border-slate-200 rounded-xl">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <User className="w-4 h-4" />
              Contact Info
            </h3>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-slate-400" />
              <span>{lead.email}</span>
            </div>
            {lead.company && (
              <div className="flex items-center gap-3 text-sm">
                <Building className="w-4 h-4 text-slate-400" />
                <span>{lead.company}</span>
              </div>
            )}
            {lead.job_title && (
              <div className="flex items-center gap-3 text-sm">
                <Briefcase className="w-4 h-4 text-slate-400" />
                <span>{lead.job_title}</span>
              </div>
            )}
            {lead.linkedin_url && (
              <a
                href={lead.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm text-indigo-600 hover:text-indigo-700"
              >
                <Linkedin className="w-4 h-4" />
                <span>LinkedIn Profile</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {lead.website && (
              <a
                href={lead.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm text-indigo-600 hover:text-indigo-700"
              >
                <Globe className="w-4 h-4" />
                <span>Website</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Engagement */}
        <div className="bg-white border border-slate-200 rounded-xl">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Engagement
            </h3>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Status</span>
              {lead.has_replied ? (
                <span className="font-semibold text-emerald-600">Replied</span>
              ) : (
                <span className="font-semibold text-amber-600">Active</span>
              )}
            </div>
            {lead.replied_at && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Replied</span>
                <span className="text-sm">{formatDate(lead.replied_at)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Dates */}
        <div className="bg-white border border-slate-200 rounded-xl">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Dates
            </h3>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Added</span>
              <span className="text-sm">{formatDate(lead.created_at)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Last Updated</span>
              <span className="text-sm">{formatRelativeTime(lead.updated_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Quick Actions</h3>
        <div className="flex items-center gap-3">
          <Link href="/campaigns" className="btn-primary">
            <Send className="w-4 h-4" />
            Add to Campaign
          </Link>
         
        </div>
      </div>

      {/* Delete Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Lead"
        description="Are you sure you want to delete this lead? This action cannot be undone. All campaign associations will also be removed."
        confirmLabel="Delete Lead"
        variant="danger"
        onConfirm={handleDelete}
        isLoading={deleteLead.isPending}
      />
    </div>
  );
}
