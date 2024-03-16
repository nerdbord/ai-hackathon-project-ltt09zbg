/*
  Warnings:

  - You are about to drop the column `chat_id` on the `userData` table. All the data in the column will be lost.
  - You are about to drop the column `monthlySpending` on the `userData` table. All the data in the column will be lost.
  - Added the required column `chatId` to the `userData` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "userData" DROP COLUMN "chat_id",
DROP COLUMN "monthlySpending",
ADD COLUMN     "chatId" BIGINT NOT NULL;
