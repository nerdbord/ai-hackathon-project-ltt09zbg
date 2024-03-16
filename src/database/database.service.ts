import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["query"],
  });

if (process.env.NODE_ENV != "production") globalForPrisma.prisma;

const createUser = async (userData: {
  chatId: number;
  firstName: string;
  lastName: string;
  languageCode: string;
  sex?: Sex;
}) => {
  prisma.userData.create({
    data: {
      chat_id: userData.chatId,
      first_name: userData.firstName,
      last_name: userData.lastName,
      language_code: userData.languageCode,
      sex: userData.sex,
    },
  });
};
