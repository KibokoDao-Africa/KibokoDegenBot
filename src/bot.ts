import dotenv from "dotenv";
import TelegramBot, { InlineKeyboardButton } from "node-telegram-bot-api";
import axios, { AxiosError } from "axios";
import { differenceInCalendarDays, parseISO, isValid } from "date-fns";

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN || "";
const apiUrl = process.env.MODEL_API_URL || "";
const bot = new TelegramBot(token, { webHook: { autoOpen: false } });

type TokenMap = { [key: string]: number };
const tokens: TokenMap = {
  'WBTC': 0, 'WETH': 1, 'USDC': 2, 'USDT': 3, 'DAI': 4, 'LINK': 5,
  'AAVE': 6, 'STETH': 7, 'WSTETH': 8, 'ETH': 9, 'FRAX': 10, 'RETH': 11,
  'YFI': 12, 'MIM': 13, '3CRV': 14, 'ALCX': 15, 'MKR': 16, 'STMATIC': 17,
  'WAVAX': 18, 'UNI': 19, 'COMP': 20, 'GNO': 21, 'COW': 22, 'ALUSD': 23,
  'SAVAX': 24, 'WMATIC': 25, 'CVX': 26, 'WOO': 27, 'TUSD': 28, 'FRXETH': 29
};

function showTokenSelection(chatId: number) {
  const keyboard: InlineKeyboardButton[][] = Object.keys(tokens).map(
    token => [{ text: token, callback_data: token }]
  );
  bot.sendMessage(chatId, "Select a token:", {
    reply_markup: { inline_keyboard: keyboard },
  });
}

async function handleCallbackQuery(callbackQuery: TelegramBot.CallbackQuery) {
  const message = callbackQuery.message;
  const chatId = message?.chat.id;
  const tokenName = callbackQuery.data;

  if (!chatId || typeof tokenName !== "string") return;

  bot.sendMessage(
    chatId,
    `Selected: ${tokenName}. Now, please enter the date (format YYYY/MM/DD).`,
    { reply_markup: { force_reply: true } }
  ).then((sent) => {
    bot.onReplyToMessage(chatId, sent.message_id, async (msg) => {
      if (msg.text && isValidDate(msg.text)) {
        await processPriceRequest(chatId, tokenName, msg.text);
      } else {
        bot.sendMessage(chatId, "Error: Invalid date format or no date provided. Please provide a date in the format YYYY/MM/DD.");
      }
    });
  });
}

function isValidDate(dateStr: string): boolean {
  const date = parseISO(dateStr);
  return isValid(date);
}

async function processPriceRequest(chatId: number, tokenName: string, dateString: string) {
  try {
    const tokenIndex = tokens[tokenName];
    const latestDate = parseISO("2024/01/23");
    const requestedDate = parseISO(dateString);
    const daysDifference = differenceInCalendarDays(requestedDate, latestDate);
    if (daysDifference < 0) {
      await bot.sendMessage(chatId, "Error: Date must be after January 23, 2024.");
      return;
    }
    const intervals = Math.floor(daysDifference / 4);
    const data = {
      "signature_name": process.env.SIGNATURE_NAME || "serving_default",
      "instances": [intervals, tokenIndex]  // Updated to be an array
    };
    const response = await axios.post(apiUrl, data);
    const predictions = response.data.predictions;
    const predictedPrice = predictions[predictions.length - 1];
    await bot.sendMessage(chatId, `Predicted closing price for ${tokenName} on ${dateString}: ${predictedPrice}`);
  } catch (error) {
    console.error(error);
    let errorMessage = "Sorry, there was an error processing your request.";
    if (axios.isAxiosError(error)) {
      const serverResponse = error.response?.data || "No response body.";
      errorMessage += ` Details: ${serverResponse}`;
    }
    await bot.sendMessage(chatId, errorMessage);
  }
}

bot.on("message", (msg) => {
  if (msg.text && (msg.text.startsWith("/command1"))) {
    showTokenSelection(msg.chat.id);
  }
});

bot.on("callback_query", handleCallbackQuery);

export { bot };
