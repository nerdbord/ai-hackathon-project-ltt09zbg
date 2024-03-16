import express, { Request, Response } from "express";
import GptClient from "./gpt/gpt.service";
import { Context } from "telegraf";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
  const bot = new Telegraf(telegramApiKey);
  const gptClient = new GptClient();

  bot.start((ctx: Context) => {
    const userName = ctx.from?.first_name;

    ctx.reply(
      `Cześć ${userName}, jestem botem, który pomoże Ci monitorować Twoje wydatki na alkohol. Jaki masz budżet miesięczny, którego nie chciałbyś przekraczać?`
    );
  });

  let chatId: any;

  bot.on("text", async (ctx: any) => {
    const userMessage = ctx.message.text;

    chatId = ctx.chat.id;

    if (userMessage) {
      ctx.reply(
        `Dziękuję! Twój miesięczny budżet na alkohol to ${userMessage} zł.`
      );
      try {
        await prisma.userData.create({
          data: {
            chatId: chatId,
            first_name: ctx.from?.first_name,
            last_name: ctx.from?.last_name,
            language_code: ctx.from?.language_code,
            monthlyBudget: +userMessage,
          },
        });
      } catch (error) {
        console.error("Błąd podczas zapisywania danych do bazy danych:", error);
        ctx.reply(
          `Przepraszam, wystąpił błąd podczas zapisywania danych${error}`
        );
      }
    } else {
      try {
        const response = await gptClient.createCathegory(userMessage);

        const botReply = response.choices[0].message?.content;

        ctx.reply(botReply);
      } catch (error) {
        console.error("Błąd podczas komunikacji z OpenAI:", error);
        ctx.reply("Przepraszam, coś poszło nie tak.");
      }
    }
  });

  bot.launch();

  console.log("Bot uruchomiony. Czekam na wiadomości...");
});

// import express, { Request, Response } from "express";
// import GptClient from "./gpt/gpt.service";
// import { Context } from "telegraf";
// import { PrismaClient } from "@prisma/client";

// const app = express();
// const port = 3000;

// app.get("/", (req: Request, res: Response) => {
//   res.send("Hello World!");
// });

// app.listen(port, () => {
//   console.log(`Server is running on port ${port}`);
//   require("dotenv").config();
//   const { Telegraf } = require("telegraf");

//   const telegramApiKey = process.env.TELEGRAM_API_KEY || "TELEGRAM_API_KEY";
//   const bot = new Telegraf(telegramApiKey);
//   const gptClient = new GptClient();

//   bot.start((ctx: Context) => {
//     const userName = ctx.from?.first_name;

//     ctx.reply(
//       `Cześć ${userName}, jestem botem, który pomoże Ci monitorować Twoje wydatki na alkohol. Jaki masz budżet miesięczny, którego nie chciałbyś przekraczać?`
//     );
//   });

//   let chatId: any;
//   let monthlyBudget: number | null = null; // Inicjalizujemy budżet jako null

//   const prisma = new PrismaClient();

//   bot.on("text", async (ctx: any) => {
//     const userMessage = ctx.message.text;

//     chatId = ctx.chat.id;

//     if (monthlyBudget) {
//       try {
//         await prisma.userData.create({
//           data: {
//             chat_id: chatId,
//             first_name: "Brak",
//             last_name: "Brak",
//             language_code: "Brak",
//             // Tutaj możesz również zapisywać inne dane użytkownika, takie jak first_name, last_name itp.
//             monthlySpending: monthlyBudget,
//           },
//         });
//       } catch (error) {
//         console.error("Błąd podczas zapisywania danych do bazy danych:", error);
//         ctx.reply("Przepraszam, wystąpił błąd podczas zapisywania danych.");
//       }
//     } else {
//       try {
//         const response = await gptClient.createCathegory(userMessage);

//         const botReply = response.choices[0].message?.content;

//         ctx.reply(botReply);
//       } catch (error) {
//         console.error("Błąd podczas komunikacji z OpenAI:", error);
//         ctx.reply("Przepraszam, coś poszło nie tak.");
//       }
//     }
//   });

//   bot.launch();

//   console.log("Bot uruchomiony. Czekam na wiadomości...");
// });

//
//

// import express, { Request, Response } from "express";
// import GptClient from "./gpt/gpt.service";
// import { Context } from "telegraf";

// const app = express();
// const port = 3000;

// app.get("/", (req: Request, res: Response) => {
//   res.send("Hello World!");
// });

// app.listen(port, () => {
//   console.log(`Server is running on port ${port}`);
//   require("dotenv").config();
//   const { Telegraf } = require("telegraf");

//   const telegramApiKey = process.env.TELEGRAM_API_KEY || "TELEGRAM_API_KEY";
//   const bot = new Telegraf(telegramApiKey);
//   const gptClient = new GptClient();

//   bot.start((ctx: Context) => {
//     const userName = ctx.from?.first_name;

//     ctx.reply(`Witaj ${userName}! Dziękujemy, że dołączyłeś do naszego czatu.`);
//   });

//   let chatId: any;

//   bot.on("text", async (ctx: any) => {
//     const userMessage = ctx.message.text;

//     chatId = ctx.chat.id;

//     setInterval(async () => {
//       const message = `Jestem tu dla Ciebie`;
//       await bot.telegram.sendMessage(chatId, message);
//     }, 24 * 60 * 60 * 1000);

//     try {
//       const response = await gptClient.createCathegory(userMessage);

//       const botReply = response.choices[0].message?.content;

//       ctx.reply(botReply);
//     } catch (error) {
//       console.error("Błąd podczas komunikacji z OpenAI:", error);
//       ctx.reply("Przepraszam, coś poszło nie tak.");
//     }
//   });

//   bot.launch();

//   console.log("Bot uruchomiony. Czekam na wiadomości...");
// });
