"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Copy, Check, Link } from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface GenerateBidLinkProps {
  projectId: string;
  onCreated: () => void;
}

export function GenerateBidLink({ projectId, onCreated }: GenerateBidLinkProps) {
  const [open, setOpen] = useState(false);
  const [gcCompany, setGcCompany] = useState("");
  const [gcName, setGcName] = useState("");
  const [gcEmail, setGcEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/bids/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gcCompany: gcCompany.trim() || null,
          gcEmail: gcEmail.trim() || null,
          gcName: gcName.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to create invitation");
      const invitation = await res.json();
      const link = `${window.location.origin}/bid/${invitation.token}`;
      setGeneratedLink(link);
      onCreated();
    } catch {
      toast({ title: "Error", description: "Failed to generate bid link", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast({ title: "Link copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setGcCompany("");
      setGcName("");
      setGcEmail("");
      setGeneratedLink(null);
      setCopied(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Link className="h-4 w-4 mr-2" /> Generate Bid Link
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {generatedLink ? "Bid Link Generated" : "Generate Bid Link"}
            </DialogTitle>
          </DialogHeader>

          {!generatedLink ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Create a public link that a GC can use to submit a bid. The fields below are optional
                and will pre-fill the GC&apos;s form.
              </p>
              <div>
                <label className="text-sm font-medium">GC Company (optional)</label>
                <Input
                  value={gcCompany}
                  onChange={(e) => setGcCompany(e.target.value)}
                  placeholder="Company name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">GC Contact Name (optional)</label>
                <Input
                  value={gcName}
                  onChange={(e) => setGcName(e.target.value)}
                  placeholder="Contact person"
                />
              </div>
              <div>
                <label className="text-sm font-medium">GC Email (optional)</label>
                <Input
                  value={gcEmail}
                  onChange={(e) => setGcEmail(e.target.value)}
                  placeholder="email@company.com"
                />
              </div>
              <DialogFooter>
                <Button onClick={handleGenerate} disabled={loading}>
                  {loading ? "Generating..." : "Generate Link"}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Share this link with the GC. They can submit their bid without needing to log in.
              </p>
              <div className="flex items-center gap-2">
                <Input value={generatedLink} readOnly className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => handleClose(false)}>
                  Done
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
