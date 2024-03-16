/*
  Warnings:

  - Added the required column `monthlyBudget` to the `userData` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "userData" ADD COLUMN     "monthlyBudget" INTEGER NOT NULL;
