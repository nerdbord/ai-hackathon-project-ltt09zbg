import express, { Request, Response } from "express";
import GptClient from "./gpt/gpt.service";
import { Context } from "telegraf";
import { createUser } from "./database/database.service";
import { CreateUserPayload } from "./types/user.types";

const app = express();
const port = 3000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  require("dotenv").config();
  const { Telegraf } = require("telegraf");

  const telegramApiKey = process.env.TELEGRAM_API_KEY || "TELEGRAM_API_KEY";
  // Inicjalizacja bota Telegram
  const bot = new Telegraf(telegramApiKey);
  const gptClient = new GptClient();


  bot.start(async (ctx: Context) => {
    const userPayload: CreateUserPayload = {
      chatId: ctx.chat?.id || 0, // Ensure a default value in case ctx.chat?.id is undefined
      first_name: ctx.from?.first_name || "",
      last_name: ctx.from?.last_name || "",
      language_code: ctx.from?.language_code || "",
      // Add other properties as needed
    };

    // Insert user information into the database
    await createUser(userPayload);

    // Wyślij wiadomość powitalną
    ctx.reply(
      `Witaj ${userPayload.first_name}! Dziękujemy, że dołączyłeś do naszego czatu.`
    );

    ctx.reply(
      `${userPayload.chatId} ${userPayload.first_name}  ${userPayload.last_name} ${userPayload.language_code}`
    );
  });

  // Obsługa wiadomości od użytkowników
  bot.on("text", async (ctx: any) => {
    const userMessage = ctx.message.text;

    // Pobierz chatId i przechowaj go
    chatId = ctx.chat.id;

    // Uruchom interwał wysyłający wiadomość co 5 sekund
    setInterval(async () => {
      const message = `Elo`;
      await bot.telegram.sendMessage(chatId, message);
    }, 5000);

    // Wywołaj ChatGPT, aby uzyskać odpowiedź na wiadomość użytkownika
    try {
      const response = await gptClient.createCathegory(userMessage);

      const botReply = response.choices[0].message?.content;
      // albo przekierować do funkcji procesujących dane

      // Odpowiedź użytkownikowi
      ctx.reply(botReply);
    } catch (error) {
      console.error("Błąd podczas komunikacji z OpenAI:", error);
      ctx.reply("Przepraszam, coś poszło nie tak.");
    }
  });

  // Start bota
  bot.launch();

  console.log("Bot uruchomiony. Czekam na wiadomości...");
});
