import { Telegraf, Context } from "telegraf";
import GptClient from "../gpt/gpt.service";
import {
  getUserDataContext,
  createUser,
  updateMonthBudget,
} from "../database/database.service";
import { CreateUserPayload } from "../types/user.types";
import { PrismaClient } from "@prisma/client";

const gptClient = new GptClient();
const prisma = new PrismaClient();

const getUserSession = (ctx: Context) => {
  const userPayload: CreateUserPayload = {
    chatId: ctx.chat?.id || 0,
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
  const botReply = response.choices[0].message?.content;
  ctx.reply(botReply);

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
      // be careful, budget is update but in every message is uptading !
      // we should avoid this behavior !!
      // now after chat welcome message we put our budget,
      // theh budget is uptade what is corrent,
      //but if we send another message, budget will be uptadig again
      // work only on comand /start in telegram
      try {
        await prisma.userData.updateMany({
          where: {
            chatId: userData.chatId,
          },
          data: {
            monthlyBudget: parseInt(userMessage),
          },
        });
      } catch (error) {
        console.error(
          "Błąd podczas aktualizacji danych w bazie danych:",
          error
        );
        ctx.reply(
          `Przepraszam, wystąpił błąd podczas aktualizacji danych${error}`
        );
      }
      // new uptade bellowe:
      // await updateMonthBudget(userPayload);
    } else if ("new_chat_members" in ctx.message) {
      // handle different type of message, if needed
    }
    //
    // in future add chat gpt sugestion to user!
    if (+userMessage >= 500) {
      ctx.reply("Czy Ty kurwa nie przesadzasz ?");
    }

    gptClient.userDataContext = userData;
    console.log(userData);

    const response = await gptClient.commentBudget(
      userMessage,
      userData.language_code
    );
    const botReply = response.choices[0].message?.content;
    ctx.reply(botReply);

    // const response = await gptClient.createCathegory(userMessage);

    // const botReply = response.choices[0].message?.content;
    // // albo przekierować do funkcji procesujących dane

    // // Odpowiedź użytkownikowi
    // ctx.reply(botReply);
  } catch (error) {
    console.error("Błąd podczas komunikacji:", error);
    //ctx.reply("Przepraszam, coś poszło nie tak.");
  }
}
