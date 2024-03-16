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
  const existingUser = await prisma.userData.findMany({
    where: {
      chatId: payload.chatId,
    },
  });

  if (existingUser) return;
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

export async function updateMonthBudget(payload: CreateUserPayload) {
  try {
    await prisma.userData.updateMany({
      where: {
        chatId: payload.chatId,
      },
      data: {
        monthlyBudget: payload.monthly_budget, // Używamy wartości z obiektu payload
      },
    });
  } catch (error) {
    console.error("Błąd podczas aktualizacji danych w bazie danych:", error);
    // W przypadku błędu, zwróć komunikat do obsługi
    throw error; // Rzucamy błąd dalej, aby obsłużyć go na wyższym poziomie
  }
}
