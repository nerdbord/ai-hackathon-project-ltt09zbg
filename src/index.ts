import express, { Request, Response } from "express";

const app = express();
const port = 3000;

app.get("/", (req: Request, res: Response) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  require("dotenv").config();
  const { Telegraf } = require("telegraf");
  const OpenAI = require("openai");

  // Konfiguracja klienta OpenAI
  const openaiApiKey = process.env["OPENAI_API_KEY"] || "OPENAI_API_KEY";
  const telegramApiKey = process.env.TELEGRAM_API_KEY || "TELEGRAM_API_KEY";
  console.log(openaiApiKey, telegramApiKey);
  const openaiClient = new OpenAI({
    apiKey: openaiApiKey, // This is the default and can be omitted
  });

  // Inicjalizacja bota Telegram
  const bot = new Telegraf(telegramApiKey);

  // Obsługa wiadomości od użytkowników
  bot.on("text", async (ctx: any) => {
    const userMessage = ctx.message.text;

    // Wywołaj ChatGPT, aby uzyskać odpowiedź na wiadomość użytkownika
    try {
      const response = await openaiClient.complete({
        engine: "davinci",
        prompt: userMessage,
        maxTokens: 50,
      });

      const botReply = response.data.choices[0].text.trim();

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
