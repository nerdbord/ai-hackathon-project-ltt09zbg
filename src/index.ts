import express, { Request, Response } from "express";
import GptClient from "./gpt/gpt.service";
import { Context } from "telegraf";

const app = express();
const port = 3000;

app.get("/", (req: Request, res: Response) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  require("dotenv").config();
  const { Telegraf } = require("telegraf");

  const telegramApiKey = process.env.TELEGRAM_API_KEY || "TELEGRAM_API_KEY";
  // Inicjalizacja bota Telegram
  const bot = new Telegraf(telegramApiKey);
  const gptClient = new GptClient();

  // Obsługa komendy start
  bot.start((ctx: Context) => {
    // Pobierz imię użytkownika
    const userName = ctx.from?.first_name;

    // Wyślij wiadomość powitalną
    ctx.reply(`Witaj ${userName}! Dziękujemy, że dołączyłeś do naszego czatu.`);
  });

  // ???

  // setInterval(async (ctx: Context) => {
  //   //const users = await bot.telegram.getChatMembersCount();
  //   const message = `Elo`;
  //   await bot.telegram.sendMessage(ctx.chat?.id, message);
  // }, 5000); // 5 sekund w milisekundach

  //

  let chatId: any;

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
