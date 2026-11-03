"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { useCreateCampaign } from "@/lib/api/hooks";
import { CampaignCreate } from "@/lib/api/types";

export default function NewCampaignPage() {
  const router = useRouter();
  const createCampaign = useCreateCampaign();

  const [formData, setFormData] = useState<CampaignCreate>({
    name: "",
    description: "",
    follow_up_delay_days: 2,
    max_follow_ups: 3,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const campaign = await createCampaign.mutateAsync(formData);
      toast.success("Campaign created successfully", {
        description: "Now add leads to get started",
      });
      router.push(`/campaigns/${campaign.id}`);
    } catch (error) {
      toast.error("Failed to create campaign");
    }
  };

  return (
    <div className="p-8  mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/campaigns"
          className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Campaigns
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Create New Campaign
        </h1>
        <p className="text-slate-500 mt-1">
          Set up your outreach campaign with AI-powered personalization
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Campaign Details Card */}
        <div className="bg-white border border-slate-200 rounded-xl">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Campaign Details</h2>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Campaign Name *
              </label>
              <input
                type="text"
                placeholder="e.g., Q1 SaaS Outreach"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Description
              </label>
              <textarea
                placeholder="Brief description of this campaign..."
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Follow-up Settings Card */}
        <div className="bg-white border border-slate-200 rounded-xl">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Follow-up Settings</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Wait Days Between Emails
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={formData.follow_up_delay_days}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      follow_up_delay_days: parseInt(e.target.value) || 2,
                    })
                  }
                  className="input"
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  Days to wait before sending follow-up
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Max Follow-ups
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.max_follow_ups}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      max_follow_ups: parseInt(e.target.value) || 3,
                    })
                  }
                  className="input"
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  Maximum follow-up emails per lead
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* AI Info */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-medium text-indigo-900">AI-Powered Personalization</h3>
              <p className="text-sm text-indigo-700 mt-1">
                Our AI will automatically generate personalized email content for each lead
                based on their profile information. Just add leads after creating the campaign.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-4">
          <Link href="/campaigns" className="btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            className="btn-primary"
            disabled={createCampaign.isPending || !formData.name}
          >
            {createCampaign.isPending ? "Creating..." : "Create Campaign"}
          </button>
        </div>
      </form>
    </div>
  );
}
