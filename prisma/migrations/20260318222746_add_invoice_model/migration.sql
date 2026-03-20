-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "budgetLineItemId" TEXT,
    "vendorName" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "amount" REAL NOT NULL,
    "date" DATETIME NOT NULL,
    "description" TEXT,
    "filePath" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending Review',
    "aiConfidence" REAL,
    "aiNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_budgetLineItemId_fkey" FOREIGN KEY ("budgetLineItemId") REFERENCES "BudgetLineItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Invoice_projectId_idx" ON "Invoice"("projectId");
