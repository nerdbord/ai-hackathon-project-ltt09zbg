import { PrismaClient } from "@prisma/client";
import { CreateUserPayload } from "../types/user.types";

const prisma = new PrismaClient();

export async function createUser(payload: CreateUserPayload) {
  try {
    const createdUser = await prisma.userData.create({
      data: {
        chatId: payload.chatId,
        first_name: payload.first_name,
        last_name: payload.last_name,
        language_code: payload.language_code,
        // Add other fields as needed
      },
    });
    return createdUser;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}
