import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface CreateUserPayload {
  chatId: bigint;
  first_name: string;
  last_name: string;
  language_code: string;
  monthly_budget?: number | null;
}
