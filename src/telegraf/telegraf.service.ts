import { Telegraf, Context } from "telegraf";
import GptClient from "../gpt/gpt.service";
import { createUser } from "../database/database.service";
import { CreateUserPayload } from "../types/user.types";
import { PrismaClient } from "@prisma/client";

const gptClient = new GptClient();
const prisma = new PrismaClient();

let userPayload: CreateUserPayload = {
  chatId: 0,
  first_name: "",
  last_name: "",
  language_code: "",
  monthly_budget: 0,
};

export function initializeTelegramBot(apiKey: string) {
  const bot = new Telegraf(apiKey);

  bot.start(handleStart);
  bot.on("text", handleText);

  return bot;
}

async function handleStart(ctx: Context) {
  //get user data from context
  userPayload = {
    chatId: ctx.chat?.id || 0,
    first_name: ctx.from?.first_name || "",
    last_name: ctx.from?.last_name || "",
    language_code: ctx.from?.language_code || "",
    monthly_budget: 0,
  };

  //bot behaviour on conversation start
  const response = await gptClient.welcomeUser(
    userPayload.first_name,
    userPayload.language_code
  );
  const botReply = response.choices[0].message?.content;
  ctx.reply(botReply);

  //save user data to db
  await createUser(userPayload);

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

    let userMessage = "";

    if ("text" in ctx.message) {
      userMessage = ctx.message.text;
      /// only for test, change to uptade montlhy budget checing if user exist first, move function to database.services first !
      // create function in database checking chatid and uptde monthly budgt because on this moment user exist in schema,
      // but with 0 bufget, because user is create on app start.
      // we should check user and uptade budget to chatid user and here only put this function export from database.
      try {
        await prisma.userData.create({
          data: {
            chatId: ctx.chat?.id || 0,
            first_name: "a",
            last_name: "b",
            language_code: "c",
            monthlyBudget: +userMessage,
          },
        });
      } catch (error) {
        console.error("Błąd podczas zapisywania danych do bazy danych:", error);
        ctx.reply(
          `Przepraszam, wystąpił błąd podczas zapisywania danych${error}`
        );
      }
    } else if ("new_chat_members" in ctx.message) {
      // handle different type of message, if needed
    }

    const response = await gptClient.createCathegory(userMessage);

    const botReply = response.choices[0].message?.content;
    // albo przekierować do funkcji procesujących dane

    // Odpowiedź użytkownikowi
    ctx.reply(botReply);
  } catch (error) {
    console.error("Błąd podczas komunikacji:", error);
    //ctx.reply("Przepraszam, coś poszło nie tak.");
  }
}
