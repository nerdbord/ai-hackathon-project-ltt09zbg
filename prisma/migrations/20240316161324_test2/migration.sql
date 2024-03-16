/*
  Warnings:

  - Changed the type of `chatId` on the `userData` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "userData" DROP COLUMN "chatId",
ADD COLUMN     "chatId" BIGINT NOT NULL;
