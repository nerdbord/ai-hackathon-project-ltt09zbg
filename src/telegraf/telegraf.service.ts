import { PrismaClient } from "@prisma/client";
import { Context, Telegraf } from "telegraf";
import {
  createDailySpending,
  createUser,
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
  ctx.reply(typeof botReply === "string" ? botReply : JSON.stringify(botReply));

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

    const userData: CreateUserPayload = await getUserDataContext(
      getUserSession(ctx)
    );

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
            updateMonthBudget(userData, newBudget, gptClient);
            break;

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
