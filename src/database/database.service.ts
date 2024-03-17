import { PrismaClient } from "@prisma/client";
import { CreateUserPayload } from "../types/user.types";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["query"],
  });

if (process.env.NODE_ENV != "production") globalForPrisma.prisma;

export async function getUserDataContext(payload: CreateUserPayload) {
  try {
    const userData = await prisma.userData.findFirst({
      where: {
        chatId: payload.chatId,
      },
    });

    if (userData) {
      const userDataPayload: CreateUserPayload = {
        chatId: BigInt(userData?.chatId),
        first_name: userData?.first_name,
        last_name: userData?.last_name,
        language_code: userData?.language_code,
        monthly_budget: userData?.monthlyBudget,
      };

      return userDataPayload;
    } else {
      return createUser(payload);
    }
  } catch (error) {
    throw error;
  }
}

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
    console.log("New user created!");
    return createdUser;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

export async function updateMonthBudget(payload: CreateUserPayload, newBudgetValue: number) {
  try {
    await prisma.userData.update({
      where: {
        chatId: BigInt(payload.chatId),
      },
      data: {
        monthlyBudget: newBudgetValue, // Używamy wartości z obiektu payload
      },
    });
  } catch (error) {
    console.error("Błąd podczas aktualizacji danych w bazie danych:", error);
    // W przypadku błędu, zwróć komunikat do obsługi
    throw error; // Rzucamy błąd dalej, aby obsłużyć go na wyższym poziomie
  }
}

export async function createDailySpending(payload: CreateUserPayload, amount: number): Promise<void> {
  console.log(" createDailySpending");
  try {
    const userData = await prisma.userData.findUnique({
      where: {
        chatId: payload.chatId,
      },
    });

    if (!userData) {
      throw new Error(`User with chatId ${payload.chatId} not found.`);
    }

    await prisma.dailySpending.create({
      data: {
        chatId: payload.chatId,
        amount: parseFloat(amount.toFixed(2)),
      },
    });
    console.log("New position in daily spending created successfully.");
  } catch (error) {
    console.error("Error creating new position in daily spending:", error);
    throw error;
  }
}

export async function getRemainingBudget(payload: CreateUserPayload) {
  try {
    const userData = await prisma.userData.findFirst({
      where: {
        chatId: payload.chatId,
      },
    });

    if (!userData) {
      throw new Error("User data not found");
    }

    const userSpendings = await prisma.dailySpending.findMany({
      where: {
        chatId: payload.chatId,
      },
    });

    // Calculate total spending
    let totalSpending = 0;
    userSpendings.forEach((spending) => {
      totalSpending += spending.amount;
    });

    // Handle case when monthlyBudget is null
    const remainingBudget = userData.monthlyBudget != null ? userData.monthlyBudget - totalSpending : null;

    return remainingBudget;
  } catch (error) {
    throw error;
  }
}

export type getSpendingsFromXPeriodPayload = {
  chatId: bigint;
  startDate: Date;
  finishDate: Date;
};

export async function getSpendingsFromXPeriod(payload: getSpendingsFromXPeriodPayload) {
  try {
    const totalAmount = await prisma.dailySpending.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        chatId: payload.chatId,
        date: {
          gte: payload.startDate,
          lte: payload.finishDate,
        },
      },
    });
    console.log(payload.startDate, payload.finishDate);
    const spendings = await prisma.dailySpending.findMany({
      where: {
        chatId: payload.chatId,
        date: {
          gte: payload.startDate,
          lte: payload.finishDate,
        },
      },
      select: {
        amount: true,
        date: true,
      },
      orderBy: {
        date: "asc",
      },
    });
    console.log("SPENDINGS", spendings, `${payload.startDate}`);
    const diffTime = Math.abs(payload.finishDate.getTime() - payload.startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) {
      return {
        periodical: undefined,
        total: totalAmount._sum.amount,
      };
    } else if (diffDays <= 7) {
      // Group by each day of the week
      let summedByDay = spendings.reduce(function (acc, spending) {
        let key = spending.date.getDay();
        acc[key] = (acc[key] || 0) + spending.amount;
        return acc;
      }, {} as any);

      return {
        periodical: Object.keys(summedByDay).reduce((obj, key) => {
          obj[["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][Number(key)]] =
            summedByDay[key];
          return obj;
        }, {} as any),
        total: totalAmount._sum.amount,
      };
    } else if (diffDays <= 31) {
      // Group by week of the month
      let summedByWeek = spendings.reduce(function (acc, spending) {
        let key = Math.ceil(spending.date.getDate() / 7);
        acc[key] = (acc[key] || 0) + spending.amount;
        return acc;
      }, {} as any);

      return {
        periodical: Object.keys(summedByWeek).reduce((obj, key) => {
          obj[`Week ${key} of the month`] = summedByWeek[key];
          return obj;
        }, {} as any),
        total: totalAmount._sum.amount,
      };
    } else {
      // Group by month of the year
      let summedByMonth = spendings.reduce(function (acc, spending) {
        let key = spending.date.getMonth();
        acc[key] = (acc[key] || 0) + spending.amount;
        return acc;
      }, {} as any);

      return {
        periodical: Object.keys(summedByMonth).reduce((obj, key) => {
          obj[
            [
              "January",
              "February",
              "March",
              "April",
              "May",
              "June",
              "July",
              "August",
              "September",
              "October",
              "November",
              "December",
            ][Number(key)]
          ] = summedByMonth[key];
          return obj;
        }, {} as any),
        total: totalAmount._sum.amount,
      };
    }
  } catch (error) {
    console.error("Błąd podczas zbierania danych wydatków z dni", error);
    throw error;
  }
}
