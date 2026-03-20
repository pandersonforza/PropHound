-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Invoice" (
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
    "submittedBy" TEXT,
    "approver" TEXT,
    "approverId" TEXT,
    "submittedById" TEXT,
    "submittedDate" DATETIME,
    "approvedDate" DATETIME,
    "rejectedDate" DATETIME,
    "paidDate" DATETIME,
    "rejectionReason" TEXT,
    "drawRequestId" TEXT,
    "aiConfidence" REAL,
    "aiNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_budgetLineItemId_fkey" FOREIGN KEY ("budgetLineItemId") REFERENCES "BudgetLineItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_drawRequestId_fkey" FOREIGN KEY ("drawRequestId") REFERENCES "DrawRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("aiConfidence", "aiNotes", "amount", "approvedDate", "approver", "approverId", "budgetLineItemId", "createdAt", "date", "description", "filePath", "id", "invoiceNumber", "paidDate", "projectId", "rejectedDate", "rejectionReason", "status", "submittedBy", "submittedById", "submittedDate", "updatedAt", "vendorName") SELECT "aiConfidence", "aiNotes", "amount", "approvedDate", "approver", "approverId", "budgetLineItemId", "createdAt", "date", "description", "filePath", "id", "invoiceNumber", "paidDate", "projectId", "rejectedDate", "rejectionReason", "status", "submittedBy", "submittedById", "submittedDate", "updatedAt", "vendorName" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE INDEX "Invoice_projectId_idx" ON "Invoice"("projectId");
CREATE INDEX "Invoice_approverId_idx" ON "Invoice"("approverId");
CREATE INDEX "Invoice_drawRequestId_idx" ON "Invoice"("drawRequestId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
