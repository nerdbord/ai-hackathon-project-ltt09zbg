import { PrismaClient } from "@prisma/client";
import { Context, Telegraf } from "telegraf";
import {
  createDailySpending,
  createUser,
  getRemainingBudget,
  getSpendingsFromXPeriod,
  getUserDataContext,
  updateMonthBudget,
} from "../database/database.service";
import GptClient from "../gpt/gpt.service";
import { CreateUserPayload } from "../types/user.types";

const gptClient = new GptClient();
const prisma = new PrismaClient();

const getUserSession = (ctx: Context) => {
  const userPayload: CreateUserPayload = {
    chatId: BigInt(ctx.chat?.id || 0),
    first_name: ctx.from?.first_name || "",
    last_name: ctx.from?.last_name || "",
    language_code: ctx.from?.language_code || "",
    monthly_budget: 0,
  };
  return userPayload;
};

export function initializeTelegramBot(apiKey: string) {
  const bot = new Telegraf(apiKey);

  bot.start(handleStart);
  bot.command("help", (ctx) => {
    const instrukcje = `Jasne! To jest to co możemy zrobić:
1. **Aktualizacja Miesięcznego Budżetu**: Możesz zaktualizować swój miesięczny budżet kiedy tylko chcesz. Wystarczy, że napiszesz Zaktualizuj budżet na X, gdzie X to nowy budżet, który chcesz ustawić.
2. **Dodawanie Wydatków**: Możesz zapisywać swoje codzienne wydatki. Wystarczy, że napiszesz Dodaj wydatek X, gdzie X to kwota wydatku.
3. **Sprawdzanie Pozostałego Budżetu**: Jeśli chcesz dowiedzieć się, ile zostało Ci z budżetu, możesz zapytać Ile zostało w budżecie? a ja odpowiem Ci ile jeszcze masz do wydania.
4. **Podsumowanie Wydatków**: Możesz zobaczyć, ile wydałeś w określonym okresie. Aby to zrobić, napisz Pokaż wydatki od daty do daty (np. DD-MM-YYYY do DD-MM-YYYY, gdzie DD-MM-YYYY to data początkowa i końcowa okresu, który chcesz sprawdzić, najważniejsze byś podał całą datę).
Pamiętaj, że zawsze jestem tutaj, aby pomóc Ci kontrolować swoje finanse. Jeśli potrzebujesz pomocy, po prostu mnie zapytaj. 
Przypominam, komenda pomocy to /help.
  `;
    ctx.reply(instrukcje);
  });
  bot.on("text", handleText);

  return bot;
}

async function handleStart(ctx: Context) {
  //get user data from context

  const userPayload = getUserSession(ctx);
  const userData = await getUserDataContext(userPayload);

  if (!userData) {
    await createUser(userPayload);
  }

  //bot behaviour on conversation start
  const response = await gptClient.welcomeNewUser(
    userPayload.first_name,
    userPayload.language_code,
    Number(userPayload.monthly_budget)
  );
  const botReply = response;
  const instrukcje = "By dowiedzieć się co możemy razem zdziałać wpisz komendę /help";
  ctx.reply(
    typeof botReply === "string" ? `${botReply}\n\n${instrukcje}` : `${JSON.stringify(botReply)}\n\n${instrukcje}`
  );

  //save user data to db

  //   ctx.reply(
  //     `Witaj ${userPayload.first_name}! Dziękujemy, że dołączyłeś do naszego czatu.`
  //   );

  //   ctx.reply(
  //     `${userPayload.chatId} ${userPayload.first_name}  ${userPayload.last_name} ${userPayload.language_code}`
  //   );
}

async function handleText(ctx: Context) {
  try {
    if (!ctx || !ctx.message) {
      throw new Error("Context or message is undefined.");
    }

    const userData: CreateUserPayload = await getUserDataContext(getUserSession(ctx));

    let userMessage = "";

    if ("text" in ctx.message) {
      userMessage = ctx.message.text;

      gptClient.userDataContext = userData;
      const response = await gptClient.provideFunctionality(userMessage);

      console.log(response);
      // const response = await gptClient.commentBudget(
      //   userMessage,
      //   userData.language_code
      // );

      if (typeof response === "string") {
        ctx.reply(response);
      } else {
        switch (response.name) {
          case "updateMonthlyBudget":
            const newBudget = JSON.parse(response.arguments).budget;
            updateMonthBudget(userData, newBudget);
            const budgetString: string = newBudget.toString();
            const localResponse = await gptClient.commentBudget(
              newBudget.toString(), // Ensure newBudget is a string
              userData.language_code
            );

            ctx.reply(`${localResponse}`);

            break;
          case "updateSpendings":
            const newSpending = JSON.parse(response.arguments).spending;
            createDailySpending(userData, newSpending);
            const spendingString: string = newSpending.toString();
            const newSpendingResponse = await gptClient.confirmAddedSpending(
              newSpending.toString(), // Ensure newBudget is a string
              userData.language_code
            );
            ctx.reply(`${newSpendingResponse}`);
            break;

          case "getRemaingBudget":
            const remainingBudget = await getRemainingBudget(userData);
            const budgetResponse = await gptClient.commentRemaingBudget(
              remainingBudget ? remainingBudget : 0,
              userData.language_code
            );
            ctx.reply(`${budgetResponse}`);
            break;
          case "getTimePeriod":
            const timePeriodData = JSON.parse(response.arguments);
            const spendings = await getSpendingsFromXPeriod({
              chatId: BigInt(ctx.chat?.id || 0),
              startDate: new Date(
                timePeriodData.startingDate.year || 2024,
                timePeriodData.startingDate.month - 1,
                timePeriodData.startingDate.day
              ),
              finishDate: new Date(
                timePeriodData.finishDate.year || 2024,
                timePeriodData.finishDate.month - 1,
                timePeriodData.finishDate.day + 1
              ),
            });
            console.log(spendings, "SPENDINGS");
            let periodical = "";
            Object.keys(spendings.periodical).forEach((period: keyof typeof spendings.periodical, index) => {
              periodical += `\n${String(period)}: ${spendings.periodical[period]}${
                index + 1 < Object.keys(spendings.periodical).length ? "," : "."
              }`;
            });
            ctx.reply(
              `Sumarycznie wydałeś: ${spendings.total}\n${
                periodical !== "" ? `Tak wyglądały twoje wydatki w ostatnim czasie: ${periodical}` : ""
              }`
            );
          default:
            console.log("no action");
        }
      }
    }
  } catch (error) {
    console.error("Błąd podczas komunikacji:", error);
    //ctx.reply("Przepraszam, coś poszło nie tak.");
  }
}
