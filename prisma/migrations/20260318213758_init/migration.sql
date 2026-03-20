-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "stage" TEXT NOT NULL DEFAULT 'Pre-Development',
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "totalBudget" REAL NOT NULL,
    "projectManager" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BudgetCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryGroup" TEXT NOT NULL,
    CONSTRAINT "BudgetCategory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BudgetLineItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "originalBudget" REAL NOT NULL,
    "revisedBudget" REAL NOT NULL,
    "committedCost" REAL NOT NULL DEFAULT 0,
    "actualCost" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "BudgetLineItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BudgetCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "lineItemId" TEXT,
    "title" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contract_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Contract_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Contract_lineItemId_fkey" FOREIGN KEY ("lineItemId") REFERENCES "BudgetLineItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DrawRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "drawNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "totalAmount" REAL NOT NULL,
    "submittedDate" DATETIME,
    "approvedDate" DATETIME,
    "fundedDate" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DrawRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DrawLineItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "drawRequestId" TEXT NOT NULL,
    "budgetLineItemId" TEXT NOT NULL,
    "currentAmount" REAL NOT NULL,
    "previousDraws" REAL NOT NULL,
    "thisDrawAmount" REAL NOT NULL,
    CONSTRAINT "DrawLineItem_drawRequestId_fkey" FOREIGN KEY ("drawRequestId") REFERENCES "DrawRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DrawLineItem_budgetLineItemId_fkey" FOREIGN KEY ("budgetLineItemId") REFERENCES "BudgetLineItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "uploadDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    CONSTRAINT "Document_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "BudgetCategory_projectId_idx" ON "BudgetCategory"("projectId");

-- CreateIndex
CREATE INDEX "BudgetLineItem_categoryId_idx" ON "BudgetLineItem"("categoryId");

-- CreateIndex
CREATE INDEX "Contract_projectId_idx" ON "Contract"("projectId");

-- CreateIndex
CREATE INDEX "Contract_vendorId_idx" ON "Contract"("vendorId");

-- CreateIndex
CREATE INDEX "DrawRequest_projectId_idx" ON "DrawRequest"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "DrawRequest_projectId_drawNumber_key" ON "DrawRequest"("projectId", "drawNumber");

-- CreateIndex
CREATE INDEX "DrawLineItem_drawRequestId_idx" ON "DrawLineItem"("drawRequestId");

-- CreateIndex
CREATE INDEX "Document_projectId_idx" ON "Document"("projectId");
