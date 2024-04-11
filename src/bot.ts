import dotenv from 'dotenv';
import TelegramBot, { InlineKeyboardButton } from 'node-telegram-bot-api';
import axios from 'axios';
import { differenceInCalendarDays, parseISO } from 'date-fns';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN || '';
const apiUrl = process.env.MODEL_API_URL || '';
const bot = new TelegramBot(token);

type TokenMap = { [key: string]: number };
const tokens: TokenMap = {
  // ... your tokens object ...
};
const latest_date_in_dataset = '2024/01/23';
const interval = 4;

function showTokenSelection(chatId: number) {
  const keyboard: InlineKeyboardButton[][] = Object.keys(tokens).map(token => [{ text: token, callback_data: token }]);
  bot.sendMessage(chatId, 'Select a token:', { reply_markup: { inline_keyboard: keyboard } });
}

async function handleCallbackQuery(callbackQuery: TelegramBot.CallbackQuery) {
  const message = callbackQuery.message;
  const chatId = message?.chat.id;
  const tokenName = callbackQuery.data;

  if (!chatId || typeof tokenName !== 'string') return;

  bot.sendMessage(chatId, `Selected: ${tokenName}. Now, please enter the date (format YYYY/MM/DD).`, { reply_markup: { force_reply: true } })
    .then(sent => {
      bot.onReplyToMessage(chatId, sent.message_id, async msg => {
        if (msg.text) {
          await processPriceRequest(chatId, tokenName, msg.text);
        } else {
          bot.sendMessage(chatId, "Error: No date provided. Please provide a date in the format YYYY/MM/DD.");
        }
      });
    });
}

async function processPriceRequest(chatId: number, tokenName: string, dateString: string) {
  try {
    const tokenIndex = tokens[tokenName];
    if (tokenIndex === undefined) {
      await bot.sendMessage(chatId, `Unsupported token: ${tokenName}`);
      return;
    }

    const latestDate = parseISO(latest_date_in_dataset);
    const requestedDate = parseISO(dateString);
    const daysDifference = differenceInCalendarDays(requestedDate, latestDate);
    const intervals = Math.floor(daysDifference / interval);

    // Using the API URL from .env
    if (!apiUrl) {
      throw new Error("API URL not configured in .env file.");
    }

    const data = {
      instances: [{
        interval: intervals,
        token: tokenIndex
      }]
    };

    const response = await axios.post(apiUrl, data);
    const predictions = response.data.predictions;
    // Assuming the predictions array is ordered and has the required index
    const predictedPrice = predictions.length > intervals ? predictions[intervals] : 'No prediction available for this date';

    await bot.sendMessage(chatId, `Predicted closing price for ${tokenName} on ${dateString}: ${predictedPrice}`);
  } catch (error) {
    console.error(error);
    let errorMessage = 'Sorry, there was an error processing your request.';
    if (error instanceof Error) {
      errorMessage += ` ${error.message}`;
    }
    await bot.sendMessage(chatId, errorMessage);
  }
}

bot.on('message', (msg) => {
  if (msg.text?.startsWith('/closingprice')) {
    showTokenSelection(msg.chat.id);
  }
});

bot.on('callback_query', handleCallbackQuery);

export { bot };
