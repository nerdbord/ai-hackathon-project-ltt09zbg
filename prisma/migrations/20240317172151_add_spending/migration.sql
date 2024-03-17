/*
  Warnings:

  - You are about to drop the column `userId` on the `dailySpending` table. All the data in the column will be lost.
  - Added the required column `chatId` to the `dailySpending` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "dailySpending" DROP CONSTRAINT "dailySpending_userId_fkey";

-- AlterTable
ALTER TABLE "dailySpending" DROP COLUMN "userId",
ADD COLUMN     "chatId" BIGINT NOT NULL;

-- AddForeignKey
ALTER TABLE "dailySpending" ADD CONSTRAINT "dailySpending_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "userData"("chatId") ON DELETE RESTRICT ON UPDATE CASCADE;
