"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Plus,
  Upload,
  Search,
  Users,
  Building,
  CheckCircle,
  ExternalLink,
  MoreHorizontal,
  Trash2,
  Download,
  Edit,
} from "lucide-react";
import {
  useLeads,
  useCreateLead,
  useBulkCreateLeads,
  useDeleteLead,
  useImportLeadsCsv,
  useUpdateLead,
} from "@/lib/api/hooks";
import { Lead, LeadCreate, LeadUpdate } from "@/lib/api/types";
import { leadApi } from "@/lib/api/client";
import { formatDate, parseCSV } from "@/lib/utils";

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

export default function LeadsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: leads, isLoading } = useLeads();
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const bulkCreateLeads = useBulkCreateLeads();
  const deleteLead = useDeleteLead();
  const importCsv = useImportLeadsCsv();

  // State
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  
  // Delete Dialog State
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);

  const [newLead, setNewLead] = useState<LeadCreate>({
    email: "",
    first_name: "",
    last_name: "",
    company: "",
    job_title: "",
  });
  const [csvData, setCsvData] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Filter leads by search
  const filteredLeads =
    leads?.filter((lead) => {
      const searchLower = searchQuery.toLowerCase();
      return (
        lead.email.toLowerCase().includes(searchLower) ||
        lead.first_name?.toLowerCase().includes(searchLower) ||
        lead.last_name?.toLowerCase().includes(searchLower) ||
        lead.company?.toLowerCase().includes(searchLower)
      );
    }) ?? [];

  // Handlers
  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createLead.mutateAsync(newLead);
      toast.success("Lead added successfully");
      setShowAddDialog(false);
      setNewLead({
        email: "",
        first_name: "",
        last_name: "",
        company: "",
        job_title: "",
      });
    } catch (error) {
      toast.error("Failed to add lead");
    }
  };

  const handleEditClick = (lead: Lead) => {
    setEditingLead(lead);
    setShowEditDialog(true);
  };

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;

    try {
      const updateData: LeadUpdate = {
        email: editingLead.email,
        first_name: editingLead.first_name,
        last_name: editingLead.last_name,
        company: editingLead.company,
        job_title: editingLead.job_title,
      };

      await updateLead.mutateAsync({
        leadId: editingLead.id,
        data: updateData,
      });

      toast.success("Lead updated successfully");
      setShowEditDialog(false);
      setEditingLead(null);
    } catch (error) {
      toast.error("Failed to update lead");
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await leadApi.exportCsv();
      toast.success("Leads exported successfully");
    } catch (error) {
      toast.error("Failed to export leads");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = () => {
    const rows = parseCSV(csvData);
    if (rows.length === 0) {
      toast.error("No valid data found in CSV");
      return;
    }

    const leadsToImport: LeadCreate[] = rows
      .map((row) => ({
        email: row.email || row.Email || "",
        first_name: row.firstName || row["First Name"] || row.first_name || "",
        last_name: row.lastName || row["Last Name"] || row.last_name || "",
        company: row.company || row.Company || "",
        job_title:
          row.jobTitle || row["Job Title"] || row.job_title || row.title || "",
      }))
      .filter((l) => l.email);

    if (leadsToImport.length === 0) {
      toast.error("No valid leads found. Make sure CSV has an 'email' column.");
      return;
    }

    bulkCreateLeads.mutate(
      { leads: leadsToImport, skip_duplicates: true },
      {
        onSuccess: (result) => {
          toast.success(`Imported ${result.success_count} leads`);
          setShowImportDialog(false);
          setCsvData("");
        },
        onError: () => {
          toast.error("Failed to import leads");
        },
      }
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importCsv.mutate(
        { file, skipDuplicates: true },
        {
          onSuccess: (result) => {
            toast.success(`Imported ${result.success_count} leads`);
          },
          onError: () => {
            toast.error("Failed to import CSV file");
          },
        }
      );
    }
  };

  const handleDeleteLead = (leadId: string) => {
    setLeadToDelete(leadId);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!leadToDelete) return;

    try {
      await deleteLead.mutateAsync(leadToDelete);
      toast.success("Lead deleted");
    } catch (error) {
      toast.error("Failed to delete lead");
    } finally {
      setShowDeleteDialog(false);
      setLeadToDelete(null);
    }
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Leads</h1>
        <p className="text-slate-500 mt-1">Manage your contact database</p>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Export CSV */}
        {/* <Button 
          variant="outline" 
          onClick={handleExport}
          disabled={isExporting || !leads?.length}
        >
          <Download className="w-4 h-4" />
          {isExporting ? "Exporting..." : "Export"}
        </Button> */}

        {/* Import CSV */}
        <input
          type="file"
          ref={fileInputRef}
          accept=".csv"
          onChange={handleFileUpload}
          className="hidden"
        />
        <Button variant="outline" onClick={() => setShowImportDialog(true)}>
          <Upload className="w-4 h-4" />
          Import
        </Button>

        {/* Add Lead */}
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4" />
          Add Lead
        </Button>
      </div>

      {/* Leads Table */}
      {isLoading ? (
        <LeadsTableSkeleton />
      ) : filteredLeads.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name / Email</th>
                <th>Company</th>
                <th>Status</th>
                <th>Created</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  onEdit={() => handleEditClick(lead)}
                  onDelete={() => handleDeleteLead(lead.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          searchQuery={searchQuery}
          onAdd={() => setShowAddDialog(true)}
          onImport={() => setShowImportDialog(true)}
        />
      )}

      {/* Add Lead Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddLead} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email *
              </label>
              <Input
                type="email"
                placeholder="john@example.com"
                value={newLead.email}
                onChange={(e) =>
                  setNewLead({ ...newLead, email: e.target.value })
                }
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  First Name
                </label>
                <Input
                  placeholder="John"
                  value={newLead.first_name || ""}
                  onChange={(e) =>
                    setNewLead({ ...newLead, first_name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Last Name
                </label>
                <Input
                  placeholder="Doe"
                  value={newLead.last_name || ""}
                  onChange={(e) =>
                    setNewLead({ ...newLead, last_name: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Company
              </label>
              <Input
                placeholder="Acme Inc"
                value={newLead.company || ""}
                onChange={(e) =>
                  setNewLead({ ...newLead, company: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Job Title
              </label>
              <Input
                placeholder="VP of Sales"
                value={newLead.job_title || ""}
                onChange={(e) =>
                  setNewLead({ ...newLead, job_title: e.target.value })
                }
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => setShowAddDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createLead.isPending}>
                {createLead.isPending ? "Adding..." : "Add Lead"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Lead Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
          </DialogHeader>
          {editingLead && (
            <form onSubmit={handleUpdateLead} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  value={editingLead.email}
                  disabled
                  className="bg-slate-50"
                />
                <p className="text-xs text-slate-500 mt-1">Email cannot be changed.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    First Name
                  </label>
                  <Input
                    value={editingLead.first_name || ""}
                    onChange={(e) =>
                      setEditingLead({
                        ...editingLead,
                        first_name: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Last Name
                  </label>
                  <Input
                    value={editingLead.last_name || ""}
                    onChange={(e) =>
                      setEditingLead({
                        ...editingLead,
                        last_name: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Company
                </label>
                <Input
                  value={editingLead.company || ""}
                  onChange={(e) =>
                    setEditingLead({ ...editingLead, company: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Job Title
                </label>
                <Input
                  value={editingLead.job_title || ""}
                  onChange={(e) =>
                    setEditingLead({ ...editingLead, job_title: e.target.value })
                  }
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setShowEditDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateLead.isPending}>
                  {updateLead.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Leads from CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Paste CSV data with columns: email, firstName, lastName, company,
              jobTitle
            </p>
            <textarea
              placeholder={`email,firstName,lastName,company,jobTitle
john@acme.com,John,Doe,Acme Inc,VP of Sales
jane@corp.com,Jane,Smith,Corp LLC,Marketing Director`}
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              rows={10}
              className="w-full min-h-[150px] rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
            />
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500">Or upload a file:</span>
              <Button
                variant="secondary"
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4" />
                Choose File
              </Button>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowImportDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={!csvData.trim() || bulkCreateLeads.isPending}
              >
                {bulkCreateLeads.isPending ? "Importing..." : "Import Leads"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog 
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Lead"
        description="Are you sure you want to delete this lead? This action cannot be undone."
        confirmLabel="Delete Lead"
        variant="danger"
        onConfirm={handleConfirmDelete}
        isLoading={deleteLead.isPending}
      />
    </div>
  );
}

// Lead Row Component
function LeadRow({
  lead,
  onEdit,
  onDelete,
}: {
  lead: Lead;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <tr>
      <td>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center">
            <span className="text-sm font-medium text-indigo-600">
              {(lead.first_name?.[0] || lead.email[0]).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-medium text-slate-900">
              {lead.first_name || lead.last_name
                ? `${lead.first_name || ""} ${lead.last_name || ""}`.trim()
                : lead.email}
            </p>
            <p className="text-sm text-slate-500">{lead.email}</p>
          </div>
        </div>
      </td>
      <td>
        {lead.company ? (
          <div className="flex items-center gap-1.5 text-slate-600">
            <Building className="w-4 h-4 text-slate-400" />
            {lead.company}
          </div>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
      <td>
        {lead.has_replied ? (
          <span className="badge badge-replied">
            <CheckCircle className="w-3 h-3 mr-1" />
            Replied
          </span>
        ) : (
          <span className="badge badge-pending">Pending</span>
        )}
      </td>
      <td className="text-slate-500">{formatDate(lead.created_at)}</td>
      <td>
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
              <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1">
                <Link
                  href={`/leads/${lead.id}`}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => setShowMenu(false)}
                >
                  <ExternalLink className="w-4 h-4" />
                  View Details
                </Link>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onEdit();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onDelete();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

// Empty State
function EmptyState({
  searchQuery,
  onAdd,
  onImport,
}: {
  searchQuery: string;
  onAdd: () => void;
  onImport: () => void;
}) {
  return (
    <div className="text-center py-16 bg-white border border-slate-200 rounded-xl shadow-sm">
      {searchQuery ? (
        <>
          <Search className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-medium text-slate-900">No leads found</h3>
          <p className="text-slate-500 mt-1">
            No leads match "{searchQuery}"
          </p>
        </>
      ) : (
        <>
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-100 flex items-center justify-center">
            <Users className="w-8 h-8 text-indigo-600" />
          </div>
          <h3 className="text-lg font-medium text-slate-900">No leads yet</h3>
          <p className="text-slate-500 mt-1 max-w-sm mx-auto">
            Add your first lead to start building your contact database
          </p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <Button variant="outline" onClick={onImport}>
              <Upload className="w-4 h-4" />
              Import CSV
            </Button>
            <Button onClick={onAdd}>
              <Plus className="w-4 h-4" />
              Add Lead
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// Loading Skeleton
function LeadsTableSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-full bg-slate-200 skeleton" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-32 skeleton" />
              <div className="h-3 bg-slate-200 rounded w-48 skeleton" />
            </div>
            <div className="h-4 bg-slate-200 rounded w-24 skeleton" />
            <div className="h-5 bg-slate-200 rounded w-16 skeleton" />
            <div className="h-4 bg-slate-200 rounded w-20 skeleton" />
          </div>
        ))}
      </div>
    </div>
  );
}
