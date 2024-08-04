import TelegramBot, { Message } from "node-telegram-bot-api";
import axios from "axios";
import { differenceInCalendarDays, parseISO } from "date-fns";

const Calendar = require("telegram-inline-calendar");

const token: string = process.env.TELEGRAM_BOT_TOKEN || "";
const MODEL_API_URL = process.env.MODEL_API_URL || "";
const webhookUrl: string = process.env.PREVIOUS_WEBHOOK || "";
const bot = new TelegramBot(token, { webHook: true });
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

function showTokenSelection(chatId: number): void {
  const keyboard = Object.keys(TOKENS).map((token) => {
    return [{ text: token, callback_data: `token:${token}` }];
  });
  bot.sendMessage(chatId, "Select a token:", {
    reply_markup: { inline_keyboard: keyboard },
  });
}

function showPriceTypeSelection(chatId: number): void {
  const keyboard = [
    [{ text: "Open", callback_data: `priceType:0` }],
    [{ text: "High", callback_data: `priceType:1` }],
    [{ text: "Low", callback_data: `priceType:2` }],
    [{ text: "Close", callback_data: `priceType:3` }],
  ];
  bot.sendMessage(chatId, "Select price type:", {
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
    console.log("Latest date object:", latestDate);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      console.error("Invalid date format received:", dateString);
      await bot.sendMessage(
        chatId,
        "Error: Date format is invalid. Please use YYYY-MM-DD."
      );
      return;
    }

    const requestedDate = parseISO(dateString);
    console.log("Requested date object:", requestedDate);

    const daysDifference = differenceInCalendarDays(requestedDate, latestDate);
    console.log("Days difference:", daysDifference);
    if (daysDifference < 0) {
      await bot.sendMessage(
        chatId,
        `Error: Date must be after ${latestDateString}.`
      );
      return;
    }

    const intervals = Math.max(0, daysDifference) / 4;
    console.log("Logging the interval here:", intervals);
    if (isNaN(intervals)) {
      console.error(
        "Calculated intervals is NaN, daysDifference was:",
        daysDifference
      );
      await bot.sendMessage(
        chatId,
        "Error: There was a problem calculating the intervals."
      );
      return;
    }

    let tokenId = TOKENS[tokenName];

    if (!tokenId && tokenId !== 0) {
      console.error("Invalid token name:", tokenName);
      await bot.sendMessage(chatId, "Error: Invalid token name received.");
      return;
    }

    let body = {
      signature_name: "serving_default",
      instances: [intervals, tokenId, priceType],
    };

    console.log("Sending data to model:", JSON.stringify(body));

    let { data } = await axios({
      method: "POST",
      url: MODEL_API_URL,
      data: body,
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("Response from the model:", data);

    let { predictions } = data;
    let predictedPrice = predictions
      ? predictions[predictions.length - 1]
      : null;

    if (!predictedPrice) {
      throw new Error("No predictions returned from the model.");
    }

    await bot.sendMessage(
      chatId,
      `Predicted ${["open", "high", "low", "close"][priceType]} price for ${tokenName} on ${dateString}: ${predictedPrice}`
    );
  } catch (error: any) {
    console.error("Error during price request:");
    let errorMessage = "Sorry, there was an error processing your request.";

    if (error.response) {
      console.log(error.response.data);
      console.log(error.response.status);
      console.log(error.response.headers);
    } else if (error.request) {
      console.log(error.request);
    } else {
      console.log("Error", error.message);
    }
    console.log(error.config);

    await bot.sendMessage(chatId, errorMessage);
  }
}

bot.on("message", (msg: Message) => {
  const command = msg.text;
  if (command === "/button") {
    bot.sendMessage(msg.chat.id, "Click the button below to proceed:", {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Open Inline Web",
              url: "https://your-website.com",
            },
          ],
        ],
      },
    });
  }
});

bot.on("callback_query", async (query) => {
  let { message, data } = query;

  let chatId = message?.chat.id || -1;

  console.log("Callback data received:", data);

  if (data?.startsWith("token:")) {
    let tokenName = data.split(":")[1].trim();

    console.log(`Token selected: ${tokenName}, showing price type selection.`);

    inMemory[chatId] = { tokenName, date: null, priceType: null };

    showPriceTypeSelection(chatId);

    return;
  }

  if (data?.startsWith("priceType:")) {
    let priceType = parseInt(data.split(":")[1].trim());

    console.log(`Price type selected: ${priceType}, showing calendar.`);

    inMemory[chatId] = { ...inMemory[chatId], priceType };

    calendar.startNavCalendar(message);

    return;
  }

  let selectedDate: string | -1 = calendar.clickButtonCalendar(query);

  if (selectedDate !== -1 || data?.startsWith("date:")) {
    selectedDate = (
      data?.startsWith("date:") ? data.split(":")[1] : selectedDate
    )
      .toString()
      .trim();

    inMemory[chatId] = { ...inMemory[chatId], date: selectedDate };

    let { tokenName, date, priceType } = inMemory[chatId];

    if (!tokenName) {
      console.error("Token not set when date was selected");
      let response = await bot.sendMessage(
        chatId,
        "Error: Token not selected. Please start over."
      );

      if (response) {
        console.log("Response from bot.sendMessage", response);
      }
      return;
    }

    if (!date) {
      console.error("Date not set when date was selected");
      let response = bot.sendMessage(
        chatId,
        "Error: Date not selected. Please start over."
      );

      if (response) {
        console.log("Response from bot.sendMessage", response);
      }

      return;
    }

    if (priceType === null) {
      console.error("Price type not set when date was selected");
      let response = bot.sendMessage(
        chatId,
        "Error: Price type not selected. Please start over."
      );

      if (response) {
        console.log("Response from bot.sendMessage", response);
      }

      return;
    }

    console.log(`Date selected: ${date}, processing price request.`);

    let response = await processPriceRequest(chatId, tokenName, date, priceType);

    console.log("Response from processPriceRequest", response);

    inMemory[chatId] = { tokenName: null, date: null, priceType: null };

    return;
  }

  bot.sendMessage(chatId, "Error: Invalid input received. Please start over.");
});

export { bot };
