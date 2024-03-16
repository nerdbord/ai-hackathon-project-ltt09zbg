import express, { Request, Response } from 'express';
import GptClient from './gpt/gpt.service';
import { Context, Middleware } from 'telegraf';

const app = express();
const port = 3000;

app.get('/', (req: Request, res: Response) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  require('dotenv').config();
  const { Telegraf } = require('telegraf');

  const telegramApiKey = process.env.TELEGRAM_API_KEY || 'TELEGRAM_API_KEY';
  // Inicjalizacja bota Telegram
  const bot = new Telegraf(telegramApiKey);
  const gptClient = new GptClient();

  bot.start((ctx: Context) => {
    // Pobierz imię użytkownika
    const chatId = ctx.chat?.id; // tego uzywamy
    const firstName = ctx.from?.first_name;
    const userId = ctx.from?.id;
    const lastName = ctx.from?.last_name;
    const languageCode = ctx.from?.language_code;

    // wrzucoic do prismy

    // Wyślij wiadomość powitalną
    ctx.reply(
      `Witaj ${firstName}! Dziękujemy, że dołączyłeś do naszego czatu.`
    );

    ctx.reply(`${chatId} ${firstName} ${userId} ${lastName} ${languageCode}`);
  });
  // Obsługa wiadomości od użytkowników
  bot.on('text', async (ctx: any) => {
    const userMessage = ctx.message.text;

    // Wywołaj ChatGPT, aby uzyskać odpowiedź na wiadomość użytkownika
    try {
      const response = await gptClient.createCathegory(userMessage);

      const botReply = response.choices[0].message?.content;
      // albo przekierować do funkcji procesujących dane

      // Odpowiedź użytkownikowi
      ctx.reply(botReply);
    } catch (error) {
      console.error('Błąd podczas komunikacji z OpenAI:', error);
      ctx.reply('Przepraszam, coś poszło nie tak.');
    }
  });

  // Start bota
  bot.launch();

  console.log('Bot uruchomiony. Czekam na wiadomości...');
});
