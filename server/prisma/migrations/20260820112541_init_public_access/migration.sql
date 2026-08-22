/*
  Warnings:

  - You are about to drop the `share_tokens` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "share_tokens" DROP CONSTRAINT "share_tokens_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "share_tokens" DROP CONSTRAINT "share_tokens_docId_fkey";

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "publicAccess" "Permission";

-- DropTable
DROP TABLE "share_tokens";
