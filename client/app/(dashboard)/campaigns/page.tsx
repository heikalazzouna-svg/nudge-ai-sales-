"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Upload,
  MoreHorizontal,
  Play,
  Pause,
  Trash2,
  Edit,
  Eye,
} from "lucide-react";
import {
  useCampaigns,
  useStartCampaign,
  usePauseCampaign,
  useResumeCampaign,
  useDeleteCampaign,
  useUpdateCampaign,
} from "@/lib/api/hooks";
import { Campaign, CampaignStatus, CampaignUpdate } from "@/lib/api/types";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

// UI Components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/app/components/ui/dialog";
import { ConfirmDialog } from "@/app/components/ui/confirm-dialog";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";

export default function CampaignsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: campaigns, isLoading } = useCampaigns();
  const startCampaign = useStartCampaign();
  const pauseCampaign = usePauseCampaign();
  const resumeCampaign = useResumeCampaign();
  const deleteCampaign = useDeleteCampaign();
  const updateCampaign = useUpdateCampaign();

  // State
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);

  // Filter campaigns by search
  const filteredCampaigns =
    campaigns?.filter((campaign) =>
      campaign.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) ?? [];

  const handleStart = async (campaignId: string) => {
    try {
      await startCampaign.mutateAsync(campaignId);
      toast.success("Campaign started successfully");
    } catch (error) {
      toast.error("Failed to start campaign");
    }
  };

  const handleResume = async (campaignId: string) => {
    try {
      await resumeCampaign.mutateAsync(campaignId);
      toast.success("Campaign resumed successfully");
    } catch (error) {
      toast.error("Failed to resume campaign");
    }
  };

  const handlePause = async (campaignId: string) => {
    try {
      await pauseCampaign.mutateAsync(campaignId);
      toast.success("Campaign paused");
    } catch (error) {
      toast.error("Failed to pause campaign");
    }
  };

  const handleDelete = (campaignId: string) => {
    setCampaignToDelete(campaignId);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!campaignToDelete) return;

    try {
      await deleteCampaign.mutateAsync(campaignToDelete);
      toast.success("Campaign deleted");
    } catch (error) {
      toast.error("Failed to delete campaign");
    } finally {
      setShowDeleteDialog(false);
      setCampaignToDelete(null);
    }
  };

  const handleEditClick = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setShowEditDialog(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign) return;

    try {
      const updateData: CampaignUpdate = {
        name: editingCampaign.name,
        description: editingCampaign.description,
        follow_up_delay_days: editingCampaign.follow_up_delay_days,
        max_follow_ups: editingCampaign.max_follow_ups,
      };

      await updateCampaign.mutateAsync({
        campaignId: editingCampaign.id,
        data: updateData,
      });

      toast.success("Campaign updated successfully");
      setShowEditDialog(false);
      setEditingCampaign(null);
    } catch (error) {
      toast.error("Failed to update campaign");
    }
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Campaigns
        </h1>
        <p className="text-slate-500 mt-1">
          Manage your sales outreach campaigns
        </p>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Import CSV (Placeholder) */}
        <Button variant="outline" disabled>
          <Upload className="w-4 h-4" />
          Import CSV
        </Button>

        {/* Add Campaign */}
        <Link href="/campaigns/new">
          <Button>
            <Plus className="w-4 h-4" />
            Add Campaign
          </Button>
        </Link>
      </div>

      {/* Campaigns Grid */}
      {isLoading ? (
        <CampaignsGridSkeleton />
      ) : filteredCampaigns.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onStart={() => handleStart(campaign.id)}
              onPause={() => handlePause(campaign.id)}
              onResume={() => handleResume(campaign.id)}
              onDelete={() => handleDelete(campaign.id)}
              onEdit={() => handleEditClick(campaign)}
            />
          ))}
        </div>
      ) : (
        <EmptyState searchQuery={searchQuery} />
      )}

      {/* Edit Campaign Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
          </DialogHeader>
          {editingCampaign && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Name
                </label>
                <Input
                  value={editingCampaign.name}
                  onChange={(e) =>
                    setEditingCampaign({
                      ...editingCampaign,
                      name: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <Textarea
                  value={editingCampaign.description || ""}
                  onChange={(e) =>
                    setEditingCampaign({
                      ...editingCampaign,
                      description: e.target.value,
                    })
                  }
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
                    value={editingCampaign.follow_up_delay_days}
                    onChange={(e) =>
                      setEditingCampaign({
                        ...editingCampaign,
                        follow_up_delay_days: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Max Follow-ups
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={editingCampaign.max_follow_ups}
                    onChange={(e) =>
                      setEditingCampaign({
                        ...editingCampaign,
                        max_follow_ups: parseInt(e.target.value) || 0,
                      })
                    }
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
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Campaign"
        description="Are you sure you want to delete this campaign? This action cannot be undone and will remove all associated data."
        confirmLabel="Delete Campaign"
        variant="danger"
        onConfirm={handleConfirmDelete}
        isLoading={deleteCampaign.isPending}
      />
    </div>
   
  );
}

// Campaign Card Component
function CampaignCard({
  campaign,
  onStart,
  onPause,
  onResume,
  onDelete,
  onEdit,
}: {
  campaign: Campaign;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="campaign-card relative bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      {/* Header with Status */}
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-slate-900 text-lg leading-tight pr-4">
          {campaign.name}
        </h3>
        <StatusBadge status={campaign.status} />
      </div>

      {/* Description */}
      <p className="text-sm text-slate-500 mb-4 line-clamp-2 min-h-[40px]">
        {campaign.description || "No description provided"}
      </p>

      {/* Meta Info */}
      <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
        <div>
          <span className="text-slate-400">Wait Duration</span>
          <p className="font-medium text-slate-700">
            {campaign.follow_up_delay_days} Days
          </p>
        </div>
        <div className="text-right">
          <span className="text-slate-400">Created</span>
          <p className="font-medium text-slate-700">
            {formatDate(campaign.created_at)}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
        <Link href={`/campaigns/${campaign.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">
            <Eye className="w-4 h-4 mr-1" />
            View
          </Button>
        </Link>

        {campaign.status === CampaignStatus.DRAFT && (
          <Button
            onClick={onStart}
            size="sm"
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Play className="w-4 h-4 mr-1" />
            Start
          </Button>
        )}

        {campaign.status === CampaignStatus.ACTIVE && (
          <Button
            onClick={onPause}
            size="sm"
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Pause className="w-4 h-4 mr-1" />
            Pause
          </Button>
        )}

        {campaign.status === CampaignStatus.PAUSED && (
          <Button
            onClick={onResume}
            size="sm"
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Play className="w-4 h-4 mr-1" />
            Resume
          </Button>
        )}

        {/* Menu */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowMenu(!showMenu)}
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onEdit();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onDelete();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: CampaignStatus }) {
  const config = {
    [CampaignStatus.ACTIVE]: { label: "Active", className: "badge-active" },
    [CampaignStatus.PAUSED]: { label: "Paused", className: "badge-paused" },
    [CampaignStatus.DRAFT]: { label: "Draft", className: "badge-draft" },
    [CampaignStatus.COMPLETED]: { label: "Completed", className: "badge-active" },
    [CampaignStatus.ARCHIVED]: { label: "Archived", className: "badge-neutral" },
  };

  const { label, className } = config[status] || config[CampaignStatus.DRAFT];

  return <span className={`badge ${className}`}>{label}</span>;
}

// Empty State Component
function EmptyState({ searchQuery }: { searchQuery: string }) {
  return (
    <div className="text-center py-16 bg-white border border-slate-200 rounded-xl shadow-sm">
      {searchQuery ? (
        <>
          <Search className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-medium text-slate-900">
            No campaigns found
          </h3>
          <p className="text-slate-500 mt-1">
            No campaigns match "{searchQuery}"
          </p>
        </>
      ) : (
        <>
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-100 flex items-center justify-center">
            <Plus className="w-8 h-8 text-indigo-600" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">
            No campaigns yet
          </h3>
          <p className="text-slate-500 mt-1 max-w-sm mx-auto">
            Create your first campaign to start sending personalized outreach
            emails
          </p>
          <Link href="/campaigns/new">
            <Button className="mt-6">
              <Plus className="w-4 h-4" />
              Create Campaign
            </Button>
          </Link>
        </>
      )}
    </div>
  );
}

// Loading Skeleton
function CampaignsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"
        >
          <div className="flex justify-between mb-3">
            <div className="h-6 bg-slate-200 rounded w-32 skeleton" />
            <div className="h-5 bg-slate-200 rounded w-16 skeleton" />
          </div>
          <div className="h-4 bg-slate-200 rounded w-full mb-2 skeleton" />
          <div className="h-4 bg-slate-200 rounded w-2/3 mb-4 skeleton" />
          <div className="flex justify-between mb-4">
            <div className="h-8 bg-slate-200 rounded w-24 skeleton" />
            <div className="h-8 bg-slate-200 rounded w-24 skeleton" />
          </div>
          <div className="h-10 bg-slate-200 rounded skeleton" />
        </div>
      ))}
    </div>
  );
}
