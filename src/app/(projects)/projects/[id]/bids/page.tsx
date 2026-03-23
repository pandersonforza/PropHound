"use client";

import { useParams } from "next/navigation";
import { BidList } from "@/components/bids/bid-list";

export default function ProjectBidsPage() {
  const params = useParams();
  const projectId = params.id as string;

  return <BidList projectId={projectId} />;
}
