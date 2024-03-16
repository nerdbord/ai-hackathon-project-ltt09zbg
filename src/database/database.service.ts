import { PrismaClient } from "@prisma/client";
import { CreateUserPayload } from "../types/user.types";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["query"],
  });

if (process.env.NODE_ENV != "production") globalForPrisma.prisma;

export async function createUser(payload: CreateUserPayload) {
  try {
    const createdUser = await prisma.userData.create({
      data: {
        chatId: payload.chatId,
        first_name: payload.first_name,
        last_name: payload.last_name,
        language_code: payload.language_code,
        monthlyBudget: payload.monthly_budget,
        // Add other fields as needed
      },
    });
    return createdUser;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}
