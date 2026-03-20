"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Loader2, Upload, FileText, Sparkles } from "lucide-react";
import { useAuth, type AuthUser } from "@/hooks/use-auth";
import type { AIInvoiceResult, Project, BudgetLineItemWithCategory } from "@/types";

interface UserOption {
  id: string;
  name: string;
  email: string;
}

type UploadStep = "upload" | "processing" | "review" | "saving";

interface InvoiceUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  onSuccess: () => void;
}

export function InvoiceUpload({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: InvoiceUploadProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<UploadStep>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // AI result + form state
  const [aiResult, setAiResult] = useState<AIInvoiceResult | null>(null);
  const [vendorName, setVendorName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedLineItemId, setSelectedLineItemId] = useState<string>("");
  const [filePath, setFilePath] = useState("");
  const [approverId, setApproverId] = useState("");
  const [approver, setApprover] = useState("");
  const [submittedBy, setSubmittedBy] = useState("");

  // Lookups
  const [projects, setProjects] = useState<Project[]>([]);
  const [lineItems, setLineItems] = useState<BudgetLineItemWithCategory[]>([]);
  const [loadingLineItems, setLoadingLineItems] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);

  // Reset all state when dialog closes
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        setStep("upload");
        setSelectedFile(null);
        setAiResult(null);
        setVendorName("");
        setInvoiceNumber("");
        setAmount(0);
        setDate("");
        setDescription("");
        setSelectedProjectId(projectId ?? "");
        setSelectedLineItemId("");
        setFilePath("");
        setApproverId("");
        setApprover("");
        setSubmittedBy(user?.name ?? "");
        setIsDragging(false);
      }
      onOpenChange(isOpen);
    },
    [onOpenChange, projectId]
  );

  // Fetch projects and users on dialog open
  useEffect(() => {
    if (!open) return;
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data: Project[]) => {
        setProjects(data);
        if (projectId) {
          setSelectedProjectId(projectId);
        }
      })
      .catch(() => {
        toast({
          title: "Error",
          description: "Failed to load projects",
          variant: "destructive",
        });
      });
    fetch("/api/auth/users")
      .then((res) => res.json())
      .then((data: UserOption[]) => setUsers(data))
      .catch(() => {});
    if (user) {
      setSubmittedBy(user.name);
    }
  }, [open, projectId, toast, user]);

  // Fetch line items when selected project changes
  useEffect(() => {
    if (!selectedProjectId) {
      setLineItems([]);
      setSelectedLineItemId("");
      return;
    }

    setLoadingLineItems(true);
    fetch(`/api/projects/${selectedProjectId}`)
      .then((res) => res.json())
      .then((project) => {
        // Flatten line items from budget categories
        const items: BudgetLineItemWithCategory[] = [];
        for (const cat of project.budgetCategories || []) {
          for (const li of cat.lineItems || []) {
            items.push({ ...li, category: cat });
          }
        }
        setLineItems(items);
        // If AI suggested a line item for this project, pre-select it
        if (
          aiResult?.suggestedLineItemId &&
          items.some((li) => li.id === aiResult.suggestedLineItemId)
        ) {
          setSelectedLineItemId(aiResult.suggestedLineItemId);
        } else {
          setSelectedLineItemId("");
        }
      })
      .catch(() => {
        setLineItems([]);
      })
      .finally(() => {
        setLoadingLineItems(false);
      });
  }, [selectedProjectId, aiResult]);

  // File selection
  const handleFileSelect = (file: File) => {
    if (file.type !== "application/pdf") {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
      return;
    }
    setSelectedFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  // Upload and process
  const handleUploadAndProcess = async () => {
    if (!selectedFile) return;

    setStep("processing");

    try {
      // Step 1: Upload the file
      const formData = new FormData();
      formData.append("file", selectedFile);
      if (projectId) {
        formData.append("projectId", projectId);
      }

      const uploadRes = await fetch("/api/invoices/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to upload file");
      }

      const uploadData = await uploadRes.json();
      setFilePath(uploadData.filePath);

      // Step 2: Process with AI
      const processRes = await fetch("/api/invoices/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: uploadData.filePath }),
      });

      if (!processRes.ok) {
        const err = await processRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to process invoice");
      }

      const result: AIInvoiceResult = await processRes.json();
      setAiResult(result);

      // Populate form with AI results
      setVendorName(result.vendorName);
      setInvoiceNumber(result.invoiceNumber ?? "");
      setAmount(result.amount);
      setDate(result.date);
      setDescription(result.description);

      if (result.suggestedProjectId) {
        setSelectedProjectId(result.suggestedProjectId);
      }

      setStep("review");
    } catch (err) {
      toast({
        title: "Processing failed",
        description:
          err instanceof Error ? err.message : "Could not process invoice",
        variant: "destructive",
      });
      setStep("upload");
    }
  };

  // Save invoice
  const handleSave = async (submitForApproval = false) => {
    if (!vendorName.trim()) {
      toast({
        title: "Validation error",
        description: "Vendor name is required",
        variant: "destructive",
      });
      return;
    }

    if (amount <= 0) {
      toast({
        title: "Validation error",
        description: "Amount must be greater than zero",
        variant: "destructive",
      });
      return;
    }

    if (submitForApproval) {
      if (!approverId || !submittedBy.trim()) {
        toast({
          title: "Validation error",
          description: "Approver is required when submitting for approval",
          variant: "destructive",
        });
        return;
      }
      if (!selectedProjectId || !selectedLineItemId) {
        toast({
          title: "Validation error",
          description: "Project and Budget Line Item are required when submitting for approval",
          variant: "destructive",
        });
        return;
      }
    }

    setStep("saving");

    try {
      const body: Record<string, unknown> = {
        vendorName: vendorName.trim(),
        invoiceNumber: invoiceNumber.trim() || null,
        amount,
        date,
        description: description.trim(),
        projectId: selectedProjectId || null,
        budgetLineItemId: selectedLineItemId || null,
        filePath,
        aiConfidence: aiResult?.confidence ?? null,
        aiNotes: aiResult?.reasoning ?? null,
      };

      if (submitForApproval) {
        const approverUser = users.find((u) => u.id === approverId);
        body.status = "Submitted";
        body.approver = approverUser?.name ?? "";
        body.approverId = approverId;
        body.submittedBy = submittedBy.trim();
        body.submittedById = user?.id ?? null;
        body.submittedDate = new Date().toISOString();
      }

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save invoice");
      }

      toast({
        title: submitForApproval
          ? "Invoice submitted for approval"
          : "Invoice created successfully",
      });
      onSuccess();
      handleOpenChange(false);
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to save invoice",
        variant: "destructive",
      });
      setStep("review");
    }
  };

  const confidenceBadge = (confidence: number) => {
    const pct = Math.round(confidence * 100);
    const color =
      pct >= 80
        ? "bg-emerald-100 text-emerald-800"
        : pct >= 50
          ? "bg-amber-100 text-amber-800"
          : "bg-red-100 text-red-800";
    return (
      <Badge variant="secondary" className={`${color} border-transparent`}>
        {pct}% confidence
      </Badge>
    );
  };

  const projectOptions = projects.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  const lineItemOptions = lineItems.map((li) => ({
    value: li.id,
    label: `${li.category.name} - ${li.description}`,
  }));

  const approverOptions = users
    .filter((u) => u.id !== user?.id)
    .map((u) => ({ value: u.id, label: u.name }));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "upload" && "Upload Invoice"}
            {step === "processing" && "Processing Invoice"}
            {step === "review" && "Review Invoice Details"}
            {step === "saving" && "Saving Invoice"}
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Upload a PDF invoice to extract data with AI."}
            {step === "processing" && "Please wait while we analyze your invoice."}
            {step === "review" &&
              "Review and confirm the AI-extracted information below."}
            {step === "saving" && "Saving your invoice..."}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : selectedFile
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-border hover:border-primary/50"
              }`}
            >
              {selectedFile ? (
                <>
                  <FileText className="h-10 w-10 text-emerald-600 mb-2" />
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Click or drag to replace
                  </p>
                </>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">
                    Drag and drop your invoice PDF here
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    or click to browse files
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleInputChange}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleUploadAndProcess} disabled={!selectedFile}>
                <Upload className="h-4 w-4 mr-2" />
                Upload &amp; Analyze
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 2: Processing */}
        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-sm font-medium">Analyzing invoice with AI...</p>
            <p className="text-xs text-muted-foreground mt-1">
              This may take a few seconds
            </p>
          </div>
        )}

        {/* Step 3: Review */}
        {step === "review" && aiResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vendorName">Vendor Name</Label>
                <Input
                  id="vendorName"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="Vendor name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">Invoice Number</Label>
                <Input
                  id="invoiceNumber"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Invoice #"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Invoice description"
                rows={3}
              />
            </div>

            {/* AI Suggested Project */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="project">Project</Label>
                {aiResult.suggestedProjectName && (
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs text-muted-foreground">
                      AI suggested: {aiResult.suggestedProjectName}
                    </span>
                    {confidenceBadge(aiResult.confidence)}
                  </div>
                )}
              </div>
              <SelectNative
                id="project"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                placeholder="Select a project"
                options={projectOptions}
              />
            </div>

            {/* AI Suggested Line Item */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="lineItem">Budget Line Item</Label>
                {aiResult.suggestedLineItemName && (
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs text-muted-foreground">
                      AI suggested: {aiResult.suggestedLineItemName}
                    </span>
                    {confidenceBadge(aiResult.confidence)}
                  </div>
                )}
              </div>
              {selectedProjectId ? (
                loadingLineItems ? (
                  <div className="h-10 flex items-center text-sm text-muted-foreground">
                    Loading line items...
                  </div>
                ) : lineItemOptions.length === 0 ? (
                  <div className="h-10 flex items-center text-sm text-amber-600">
                    No budget line items found.{" "}
                    <a
                      href={`/projects/${selectedProjectId}/budget`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline ml-1"
                    >
                      Add line items in the budget page first.
                    </a>
                  </div>
                ) : (
                  <SelectNative
                    id="lineItem"
                    value={selectedLineItemId}
                    onChange={(e) => setSelectedLineItemId(e.target.value)}
                    placeholder="Select a line item"
                    options={lineItemOptions}
                  />
                )
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a project first to choose a line item
                </p>
              )}
            </div>

            {/* Approval Workflow */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="approver">Assign Approver</Label>
                <SelectNative
                  id="approver"
                  value={approverId}
                  onChange={(e) => setApproverId(e.target.value)}
                  placeholder="Select an approver"
                  options={approverOptions}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="submittedBy">Submitted By</Label>
                <Input
                  id="submittedBy"
                  value={submittedBy}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            {/* AI Reasoning */}
            {aiResult.reasoning && (
              <div className="rounded-md bg-muted/50 border border-border p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium">AI Reasoning</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {aiResult.reasoning}
                </p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button variant="outline" onClick={() => handleSave(false)}>
                Save as Draft
              </Button>
              <Button onClick={() => handleSave(true)}>
                Submit for Approval
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 4: Saving */}
        {step === "saving" && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-sm font-medium">Saving invoice...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
