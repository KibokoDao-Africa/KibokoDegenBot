import TelegramBot, { Message } from "node-telegram-bot-api";
import axios from "axios";
import { differenceInCalendarDays, parseISO } from "date-fns";

const Calendar = require("telegram-inline-calendar");

const token: string = process.env.TELEGRAM_BOT_TOKEN || "";
const MODEL_API_URL = process.env.MODEL_API_URL || "";
const webhookUrl: string = process.env.PREVIOUS_WEBHOOK || "";
export const bot = new TelegramBot(token, { webHook: true });
const calendar = new Calendar(bot, {
  date_format: "YYYY-MM-DD",
  language: "en",
});

bot
  .setWebHook(`${webhookUrl}/bot${token}`)
  .then(() => {
    console.log("Webhook set successfully to", `${webhookUrl}/bot${token}`);
  })
  .catch((error) => {
    console.error("Error setting webhook: ", error);
  });

const TOKENS: Record<string, number> = {
  WBTC: 0,
  WETH: 1,
  USDC: 2,
  USDT: 3,
  DAI: 4,
  LINK: 5,
  AAVE: 6,
  STETH: 7,
  WSTETH: 8,
  ETH: 9,
  FRAX: 10,
  RETH: 11,
  YFI: 12,
  MIM: 13,
  CRV: 14,
  ALCX: 15,
  MKR: 16,
  STMATIC: 17,
  WAVAX: 18,
  UNI: 19,
  COMP: 20,
  GNO: 21,
  COW: 22,
  ALUSD: 23,
  SAVAX: 24,
  WMATIC: 25,
  CVX: 26,
  WOO: 27,
  TUSD: 28,
  FRXETH: 29,
};

type ChatId = number;
type Payload = {
  tokenName: string | null;
  date: string | null;
  priceType: number | null;
};
let inMemory: Record<ChatId, Payload> = {};

async function showTokenSelection(chatId: number): Promise<void> {
  const keyboard = Object.keys(TOKENS).map((token) => {
    return [{ text: token, callback_data: `token:${token}` }];
  });
  await bot.sendMessage(chatId, "Select a token:", {
    reply_markup: { inline_keyboard: keyboard },
  });
}

async function processPriceRequest(
  chatId: number,
  tokenName: string,
  dateString: string,
  priceType: number
): Promise<void> {
  try {
    const latestDateString = "2024-01-23";
    const latestDate = parseISO(latestDateString);

    const requestedDate = parseISO(dateString);
    const daysDifference = differenceInCalendarDays(requestedDate, latestDate);
    const intervals = Math.max(0, daysDifference) / 4;
    let tokenId = TOKENS[tokenName];

    let body = {
      signature_name: "serving_default",
      instances: [intervals, tokenId, priceType],
    };

    let { data } = await axios({
      method: "POST",
      url: MODEL_API_URL,
      data: body,
      headers: { "Content-Type": "application/json" },
    });

    let predictedPrice = data.predictions
      ? data.predictions[data.predictions.length - 1]
      : null;

    if (predictedPrice) {
      await bot.sendMessage(
        chatId,
        `Predicted ${["open", "high", "low", "close"][priceType]} price for ${tokenName} on ${dateString}: ${predictedPrice}`
      );
    } else {
      throw new Error("No predictions returned.");
    }
  } catch (error: any) {
    console.error("Error during price request:", error);
    await bot.sendMessage(chatId, "Error processing request.");
  }
}

// Handle the price commands
bot.on("message", async (msg: Message) => {
  const chatId = msg.chat.id;
  const command = msg.text;

  if (command) {
    if (command === "/start") {
      await bot.sendMessage(chatId, "Welcome! Use the following commands to get prices:");
      await bot.sendMessage(chatId, "/open_price - Get the open price");
      await bot.sendMessage(chatId, "/closing_price - Get the closing price");
      await bot.sendMessage(chatId, "/lowest_price - Get the lowest price");
      await bot.sendMessage(chatId, "/highest_price - Get the highest price");
    } else if (command === "/open_price" || command === "/closing_price" || command === "/lowest_price" || command === "/highest_price") {
      const priceTypeMap: Record<string, number> = {
        "/open_price": 0,
        "/closing_price": 3,
        "/lowest_price": 2,
        "/highest_price": 1,
      };

      const priceType = priceTypeMap[command];
      inMemory[chatId] = { tokenName: null, date: null, priceType };

      await showTokenSelection(chatId);
    }
  }
});

// Handle callback queries (for token selection and calendar navigation)
bot.on("callback_query", async (query) => {
  const chatId = query.message?.chat.id || -1;

  if (query.data?.startsWith("token:")) {
    const tokenName = query.data.split(":")[1];
    inMemory[chatId] = { ...inMemory[chatId], tokenName };
    
    // Show the inline calendar after the token is selected
    await calendar.startNavCalendar(query.message);
  }

  if (query.data?.startsWith("calendar:")) {
    const selectedDate = query.data.split(":")[1];
    inMemory[chatId] = { ...inMemory[chatId], date: selectedDate };

    const { tokenName, date, priceType } = inMemory[chatId];
    if (tokenName && date && priceType !== null) {
      await processPriceRequest(chatId, tokenName, date, priceType);
    }
  }
});
