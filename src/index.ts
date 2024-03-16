import express from "express";
import { initializeTelegramBot } from "./telegraf/telegraf.service";
import { createUser } from "./database/database.service";

require("dotenv").config();

const app = express();
const port = process.env.SERVER_PORT || 3000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);

  const telegramApiKey = process.env.TELEGRAM_API_KEY || "TELEGRAM_API_KEY";
  const bot = initializeTelegramBot(telegramApiKey);

  // Start the bot
  bot.launch();

  console.log("Bot launched. Waiting for messages...");
});
