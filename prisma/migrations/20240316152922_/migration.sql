-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('MAN', 'WOMAN', 'UNDEFINED');

-- CreateTable
CREATE TABLE "userData" (
    "id" TEXT NOT NULL,
    "chat_id" INTEGER NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "language_code" TEXT NOT NULL,
    "sex" "Sex" NOT NULL DEFAULT 'UNDEFINED',
    "monthlySpending" TEXT NOT NULL,

    CONSTRAINT "userData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dailySpending" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dailySpending_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "dailySpending" ADD CONSTRAINT "dailySpending_userId_fkey" FOREIGN KEY ("userId") REFERENCES "userData"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
