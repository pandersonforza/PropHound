export const PROJECT_TYPES = [
  "Residential",
  "Commercial",
  "Mixed-Use",
  "Industrial",
] as const;

export const PROJECT_STATUSES = [
  "Active",
  "On Hold",
  "Completed",
  "Dead",
] as const;

export const PROJECT_STAGES = [
  "Pre-Development",
  "Design",
  "Permitting",
  "Construction",
  "Closeout",
] as const;

export const CATEGORY_GROUPS = [
  "Hard Costs",
  "Soft Costs",
  "Financing",
  "Land",
] as const;

export const DEFAULT_SUBCATEGORIES: Record<string, string[]> = {
  "Hard Costs": ["Building Costs", "Site Costs", "Equipment", "Signage", "General Conditions"],
  "Soft Costs": ["Design Fees", "Third Party DD", "Entitlements", "Permits & Fees", "Outside Costs"],
  "Financing": ["Loan Fees", "Interest", "Closing Costs"],
  "Land": ["Acquisition", "Due Diligence"],
};

export const CONTRACT_TYPES = [
  "Lump Sum",
  "GMP",
  "Cost Plus",
  "Time & Materials",
] as const;

export const CONTRACT_STATUSES = [
  "Draft",
  "Executed",
  "In Progress",
  "Complete",
  "Terminated",
] as const;

export const DRAW_STATUSES = [
  "Draft",
  "Submitted",
  "Approved",
  "Funded",
] as const;

export const VENDOR_CATEGORIES = [
  "General Contractor",
  "Subcontractor",
  "Consultant",
  "Supplier",
] as const;

export const VENDOR_STATUSES = [
  "Active",
  "Inactive",
  "Preferred",
] as const;

export const DOCUMENT_CATEGORIES = [
  "Contracts",
  "Permits",
  "Insurance",
  "Plans",
  "Reports",
] as const;

export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  // Project statuses
  Active: { bg: "bg-emerald-900/40", text: "text-emerald-400" },
  "On Hold": { bg: "bg-amber-900/40", text: "text-amber-400" },
  Completed: { bg: "bg-blue-900/40", text: "text-blue-400" },
  Dead: { bg: "bg-red-900/40", text: "text-red-400" },

  // Milestone statuses
  Pending: { bg: "bg-gray-800/50", text: "text-gray-400" },

  // Contract statuses
  Draft: { bg: "bg-gray-800/50", text: "text-gray-400" },
  Executed: { bg: "bg-blue-900/40", text: "text-blue-400" },
  "In Progress": { bg: "bg-emerald-900/40", text: "text-emerald-400" },
  Complete: { bg: "bg-blue-900/40", text: "text-blue-400" },
  Terminated: { bg: "bg-red-900/40", text: "text-red-400" },

  // Draw statuses
  Submitted: { bg: "bg-amber-900/40", text: "text-amber-400" },
  Approved: { bg: "bg-emerald-900/40", text: "text-emerald-400" },
  Funded: { bg: "bg-blue-900/40", text: "text-blue-400" },

  // Vendor statuses
  Inactive: { bg: "bg-gray-800/50", text: "text-gray-400" },
  Preferred: { bg: "bg-purple-900/40", text: "text-purple-400" },

  // Bid statuses
  "Under Review": { bg: "bg-amber-900/40", text: "text-amber-400" },
  Accepted: { bg: "bg-emerald-900/40", text: "text-emerald-400" },

  // Invoice statuses
  "Pending Review": { bg: "bg-amber-900/40", text: "text-amber-400" },
  Rejected: { bg: "bg-red-900/40", text: "text-red-400" },
  Paid: { bg: "bg-indigo-900/40", text: "text-indigo-400" },
};

export const INVOICE_STATUSES = [
  "Pending Review",
  "Submitted",
  "Approved",
  "Rejected",
  "Paid",
] as const;

export const USER_ROLES = ["admin", "user", "viewer"] as const;

export const TASK_STATUSES = ["pending", "completed"] as const;

export const TASK_PRIORITIES = ["low", "medium", "high"] as const;

export const STAGE_COLORS: Record<string, { bg: string; text: string }> = {
  "Pre-Development": { bg: "bg-slate-800/50", text: "text-slate-400" },
  Design: { bg: "bg-violet-900/40", text: "text-violet-400" },
  Permitting: { bg: "bg-amber-900/40", text: "text-amber-400" },
  Construction: { bg: "bg-emerald-900/40", text: "text-emerald-400" },
  Closeout: { bg: "bg-blue-900/40", text: "text-blue-400" },
};
