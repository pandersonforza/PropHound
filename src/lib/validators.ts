import { z } from "zod";

export const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  address: z.string().min(1, "Address is required"),
  type: z.string().min(1, "Project type is required"),
  status: z.string().default("Active"),
  stage: z.string().default("Pre-Development"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  totalBudget: z.number().positive("Budget must be positive"),
  projectManager: z.string().min(1, "Project manager is required"),
  description: z.string().optional(),
});

export const budgetCategorySchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  name: z.string().min(1, "Category name is required"),
  categoryGroup: z.string().min(1, "Category group is required"),
});

export const budgetLineItemSchema = z.object({
  categoryId: z.string().min(1, "Category ID is required"),
  description: z.string().min(1, "Description is required"),
  originalBudget: z.number().min(0, "Original budget must be non-negative"),
  revisedBudget: z.number().min(0, "Revised budget must be non-negative"),
  committedCost: z.number().min(0).default(0),
  actualCost: z.number().min(0).default(0),
});

export const vendorSchema = z.object({
  name: z.string().min(1, "Vendor name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  company: z.string().min(1, "Company name is required"),
  category: z.string().min(1, "Category is required"),
  status: z.string().default("Active"),
});

export const contractSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  vendorId: z.string().min(1, "Vendor ID is required"),
  lineItemId: z.string().optional(),
  title: z.string().min(1, "Contract title is required"),
  amount: z.number().positive("Amount must be positive"),
  type: z.string().min(1, "Contract type is required"),
  status: z.string().default("Draft"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
});

export const drawRequestSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  drawNumber: z.number().int().positive("Draw number must be positive"),
  status: z.string().default("Draft"),
  totalAmount: z.number().min(0, "Total amount must be non-negative"),
  submittedDate: z.string().optional(),
  approvedDate: z.string().optional(),
  fundedDate: z.string().optional(),
  notes: z.string().optional(),
});

export const drawLineItemSchema = z.object({
  drawRequestId: z.string().min(1, "Draw request ID is required"),
  budgetLineItemId: z.string().min(1, "Budget line item ID is required"),
  currentAmount: z.number().min(0),
  previousDraws: z.number().min(0),
  thisDrawAmount: z.number().min(0, "Draw amount must be non-negative"),
});

export const documentSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  name: z.string().min(1, "Document name is required"),
  category: z.string().min(1, "Category is required"),
  notes: z.string().optional(),
});

export type ProjectInput = z.infer<typeof projectSchema>;
export type BudgetCategoryInput = z.infer<typeof budgetCategorySchema>;
export type BudgetLineItemInput = z.infer<typeof budgetLineItemSchema>;
export type VendorInput = z.infer<typeof vendorSchema>;
export type ContractInput = z.infer<typeof contractSchema>;
export type DrawRequestInput = z.infer<typeof drawRequestSchema>;
export type DrawLineItemInput = z.infer<typeof drawLineItemSchema>;
export type DocumentInput = z.infer<typeof documentSchema>;
