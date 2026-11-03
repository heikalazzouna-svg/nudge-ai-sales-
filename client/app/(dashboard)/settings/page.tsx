"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Save, Mail, Settings2, Clock, Shield } from "lucide-react";
import { useUserSettings, useUpdateUserSettings } from "@/lib/api/hooks";
import { UserSettingsUpdate } from "@/lib/api/types";

export default function SettingsPage() {
  const { data: settings, isLoading, refetch } = useUserSettings();
  const updateSettings = useUpdateUserSettings();

  const [formData, setFormData] = useState({
    from_name: "",
    email_signature: "",
    daily_email_limit: 50,
    follow_up_delay_days: 2,
    max_follow_ups: 3,
  });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        from_name: settings.from_name || "",
        email_signature: settings.email_signature || "",
        daily_email_limit: settings.daily_email_limit ?? 50,
        follow_up_delay_days: settings.follow_up_delay_days ?? 2,
        max_follow_ups: settings.max_follow_ups ?? 3,
      });
    }
  }, [settings]);

  const handleChange = (field: keyof typeof formData, value: string | number) => {
    setFormData({ ...formData, [field]: value });
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      const update: UserSettingsUpdate = {
        from_name: formData.from_name || null,
        email_signature: formData.email_signature || null,
        daily_email_limit: formData.daily_email_limit,
        follow_up_delay_days: formData.follow_up_delay_days,
        max_follow_ups: formData.max_follow_ups,
      };
      await updateSettings.mutateAsync(update);
      toast.success("Settings saved successfully");
      setHasChanges(false);
      refetch();
    } catch (error) {
      toast.error("Failed to save settings");
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6 ">
          <div className="h-8 bg-slate-200 rounded w-48 skeleton" />
          <div className="h-4 bg-slate-200 rounded w-64 skeleton" />
          <div className="h-64 bg-slate-200 rounded-xl skeleton" />
          <div className="h-64 bg-slate-200 rounded-xl skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 ">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Settings</h1>
          <p className="text-slate-500 mt-1">Configure your outreach preferences</p>
        </div>
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={updateSettings.isPending || !hasChanges}
        >
          <Save className="w-4 h-4" />
          {updateSettings.isPending ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Email Settings */}
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Mail className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Email Settings</h2>
              <p className="text-sm text-slate-500">Configure how your outreach emails appear</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              From Name
            </label>
            <input
              type="text"
              placeholder="e.g., Sales Team"
              value={formData.from_name}
              onChange={(e) => handleChange("from_name", e.target.value)}
              className="input"
            />
            <p className="text-xs text-slate-500 mt-1.5">
              The name that appears in the "From" field of your emails
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Email Signature
            </label>
            <textarea
              placeholder="Best regards,&#10;Your Name"
              value={formData.email_signature}
              onChange={(e) => handleChange("email_signature", e.target.value)}
              rows={4}
              className="input"
            />
            <p className="text-xs text-slate-500 mt-1.5">
              This signature will be appended to all outreach emails
            </p>
          </div>
        </div>
      </div>

      {/* Campaign Defaults */}
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Campaign Defaults</h2>
              <p className="text-sm text-slate-500">Default settings for new campaigns</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Follow-up Delay (Days)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={formData.follow_up_delay_days}
                onChange={(e) =>
                  handleChange("follow_up_delay_days", parseInt(e.target.value) || 2)
                }
                className="input"
              />
              <p className="text-xs text-slate-500 mt-1.5">
                Days between follow-up emails
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
                  handleChange("max_follow_ups", parseInt(e.target.value) || 3)
                }
                className="input"
              />
              <p className="text-xs text-slate-500 mt-1.5">
                Maximum follow-up emails per lead
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Daily Send Limit
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={formData.daily_email_limit}
                onChange={(e) =>
                  handleChange("daily_email_limit", parseInt(e.target.value) || 50)
                }
                className="input"
              />
              <p className="text-xs text-slate-500 mt-1.5">
                Maximum emails per day
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Safety Settings */}
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Safety & Limits</h2>
              <p className="text-sm text-slate-500">Protect your sender reputation</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div>
              <p className="font-medium text-slate-900">Automatic Rate Limiting</p>
              <p className="text-sm text-slate-500 mt-0.5">
                Emails are automatically throttled to stay within your daily limit
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-slate-900">
                {formData.daily_email_limit}
              </span>
              <span className="text-sm text-slate-500">/ day</span>
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div>
              <p className="font-medium text-slate-900">Reply Detection</p>
              <p className="text-sm text-slate-500 mt-0.5">
                Automatically stops sequence when a lead replies
              </p>
            </div>
            <span className="badge badge-active">Active</span>
          </div>
        </div>
      </div>

      {/* Quick Tips */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <Settings2 className="w-5 h-5 text-indigo-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-indigo-900">Pro Tips</h3>
            <ul className="mt-2 space-y-1 text-sm text-indigo-700">
              <li>• Keep daily send limits under 100 for new email domains</li>
              <li>• 2-3 day follow-up delays work best for B2B outreach</li>
              <li>• 3-4 follow-ups typically yield the best response rates</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
