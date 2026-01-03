/*
  Warnings:

  - You are about to drop the column `userId` on the `txn` table. All the data in the column will be lost.
  - Added the required column `userEmail` to the `txn` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "txn" DROP CONSTRAINT "txn_userId_fkey";

-- AlterTable
ALTER TABLE "txn" DROP COLUMN "userId",
ADD COLUMN     "userEmail" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "txn" ADD CONSTRAINT "txn_userEmail_fkey" FOREIGN KEY ("userEmail") REFERENCES "User"("email") ON DELETE RESTRICT ON UPDATE CASCADE;
