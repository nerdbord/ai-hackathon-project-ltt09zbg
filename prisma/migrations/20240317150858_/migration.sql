/*
  Warnings:

  - A unique constraint covering the columns `[chatId]` on the table `userData` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "userData_chatId_key" ON "userData"("chatId");
