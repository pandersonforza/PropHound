-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "approvedDate" DATETIME;
ALTER TABLE "Invoice" ADD COLUMN "approver" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "rejectedDate" DATETIME;
ALTER TABLE "Invoice" ADD COLUMN "rejectionReason" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "submittedBy" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "submittedDate" DATETIME;
