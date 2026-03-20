/*
  Warnings:

  - You are about to drop the column `type` on the `Project` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "tenant" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "stage" TEXT NOT NULL DEFAULT 'Pre-Development',
    "startDate" DATETIME,
    "endDate" DATETIME,
    "totalBudget" REAL NOT NULL DEFAULT 0,
    "projectManager" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Project" ("address", "createdAt", "description", "endDate", "id", "name", "projectManager", "stage", "startDate", "status", "totalBudget", "updatedAt") SELECT "address", "createdAt", "description", "endDate", "id", "name", "projectManager", "stage", "startDate", "status", "totalBudget", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
