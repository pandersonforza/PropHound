-- CreateTable
CREATE TABLE "BidInvitation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "gcCompany" TEXT,
    "gcEmail" TEXT,
    "gcName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Open',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BidInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "gcCompany" TEXT NOT NULL,
    "gcName" TEXT,
    "gcEmail" TEXT,
    "gcPhone" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Submitted',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BidLineItem" (
    "id" TEXT NOT NULL,
    "bidId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "category" TEXT,

    CONSTRAINT "BidLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BidInvitation_token_key" ON "BidInvitation"("token");

-- CreateIndex
CREATE INDEX "BidInvitation_projectId_idx" ON "BidInvitation"("projectId");

-- CreateIndex
CREATE INDEX "BidInvitation_token_idx" ON "BidInvitation"("token");

-- CreateIndex
CREATE INDEX "Bid_invitationId_idx" ON "Bid"("invitationId");

-- CreateIndex
CREATE INDEX "Bid_projectId_idx" ON "Bid"("projectId");

-- CreateIndex
CREATE INDEX "BidLineItem_bidId_idx" ON "BidLineItem"("bidId");

-- AddForeignKey
ALTER TABLE "BidInvitation" ADD CONSTRAINT "BidInvitation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "BidInvitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidLineItem" ADD CONSTRAINT "BidLineItem_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "Bid"("id") ON DELETE CASCADE ON UPDATE CASCADE;
