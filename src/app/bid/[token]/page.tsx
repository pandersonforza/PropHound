"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BidSubmissionForm } from "@/components/bids/bid-submission-form";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

interface InvitationData {
  projectName: string;
  projectAddress: string;
  status: string;
  gcCompany?: string;
  gcName?: string;
  gcEmail?: string;
}

export default function BidPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInvitation() {
      try {
        const res = await fetch(`/api/bids/invite/${token}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("This bid link was not found.");
          } else {
            setError("Failed to load bid invitation.");
          }
          return;
        }
        const invitation = await res.json();
        if (invitation.status !== "Open") {
          setError("This bid link is no longer active.");
          return;
        }
        setData(invitation);
      } catch {
        setError("Failed to load bid invitation.");
      } finally {
        setLoading(false);
      }
    }
    fetchInvitation();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-bold">Bid Unavailable</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <BidSubmissionForm
      token={token}
      projectName={data.projectName}
      projectAddress={data.projectAddress}
      prefillCompany={data.gcCompany}
      prefillName={data.gcName}
      prefillEmail={data.gcEmail}
    />
  );
}
