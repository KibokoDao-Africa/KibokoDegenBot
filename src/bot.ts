import dotenv from "dotenv";
import TelegramBot, { CallbackQuery, Message } from "node-telegram-bot-api";
import axios from "axios";
import { differenceInCalendarDays, parseISO } from "date-fns";
import axiosRetry from 'axios-retry';
import { Calendar } from 'telegram-inline-calendar';

dotenv.config();

const token: string = process.env.TELEGRAM_BOT_TOKEN || "";
const apiUrl: string = process.env.MODEL_API_URL || "";
const webhookUrl: string = process.env.WEBHOOK_URL || "";
const bot: TelegramBot = new TelegramBot(token, { webHook: true });
const calendar = new Calendar(bot, {
    date_format: "YYYY-MM-DD",
    language: "en"
});

axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

bot.setWebHook(`${webhookUrl}/bot${token}`).then(() => {
    console.log('Webhook set successfully to', `${webhookUrl}/bot${token}`);
}).catch((error) => {
    console.error('Error setting webhook: ', error);
});

const tokens: { [key: string]: number } = {
  WBTC: 0, WETH: 1, USDC: 2, USDT: 3, DAI: 4, LINK: 5,
  AAVE: 6, STETH: 7, WSTETH: 8, ETH: 9, FRAX: 10, RETH: 11,
  YFI: 12, MIM: 13, "3CRV": 14, ALCX: 15, MKR: 16, STMATIC: 17,
  WAVAX: 18, UNI: 19, COMP: 20, GNO: 21, COW: 22, ALUSD: 23,
  SAVAX: 24, WMATIC: 25, CVX: 26, WOO: 27, TUSD: 28, FRXETH: 29
};

// Declare selectedToken and selectedDate in a wider scope
let selectedToken: string = "";
let selectedDate: string = "";

function showTokenSelection(chatId: number): void {
    const keyboard = Object.keys(tokens).map(token => [{ text: token, callback_data: 'token_' + token }]);
    bot.sendMessage(chatId, "Select a token:", {
        reply_markup: { inline_keyboard: keyboard },
    });
}

async function processPriceRequest(chatId: number, tokenName: string, dateString: string): Promise<void> {
    try {
        console.log("Processing price request for ", tokenName, " on ", dateString);

        // Validate token name
        const tokenIndex = tokens[tokenName];
        if (tokenIndex === undefined) {
            await bot.sendMessage(chatId, "Error: Invalid token name provided.");
            return;
        }

        // Validate and parse dates
        const latestDateString = "2024-01-23"; // This should match the expected date format
        const latestDate = parseISO(latestDateString);
        console.log('Latest date object:', latestDate);

        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            console.error('Invalid date format received:', dateString);
            await bot.sendMessage(chatId, "Error: Date format is invalid. Please use YYYY-MM-DD.");
            return;
        }
        const requestedDate = parseISO(dateString);
        console.log('Requested date object:', requestedDate);

        // Calculate the difference in calendar days
        const daysDifference = differenceInCalendarDays(requestedDate, latestDate);
        console.log('Days difference:', daysDifference);
        if (daysDifference < 0) {
            await bot.sendMessage(chatId, `Error: Date must be after ${latestDateString}.`);
            return;
        }

        // Calculate intervals, ensure it's a number, and log the result
        const intervals = Math.max(0, daysDifference) / 4;
        console.log('Logging the interval here:', intervals);
        if (isNaN(intervals)) {
            console.error('Calculated intervals is NaN, daysDifference was:', daysDifference);
            await bot.sendMessage(chatId, "Error: There was a problem calculating the intervals.");
            return;
        }

        // Prepare data for the API request
        const data = {
            signature_name: "serving_default",
            instances: [intervals, tokenIndex] // Adjusted as per requirement
        };

        console.log("Sending data to model:", JSON.stringify(data));

        // Send request to the API
        const response = await axios.post(apiUrl, data, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('Response from the model:', response.data);

        // Extract predictions and send the result
        const predictions = response.data.predictions;
        const predictedPrice = predictions ? predictions[predictions.length - 1] : null;
        if (predictedPrice) {
            await bot.sendMessage(chatId, `Predicted closing price for ${tokenName} on ${dateString}: ${predictedPrice}`);
        } else {
            throw new Error("No predictions returned from the model.");
        }
    } catch (error) {
        console.error('Error during price request:', error);
        let errorMessage = "Sorry, there was an error processing your request.";
        if (axios.isAxiosError(error) && error.response) {
            errorMessage += ` Details: ${JSON.stringify(error.response.data, null, 2)}`;
        } else {
            errorMessage += ` Some unknown error occurred.`;
        }
        await bot.sendMessage(chatId, errorMessage);
    }
}

bot.on("message", (msg: Message) => {
    if (msg.text === '/command1') {
        showTokenSelection(msg.chat.id);
    }
});

bot.on("callback_query", async (query: CallbackQuery) => {
    const chatId: number = query.message?.chat.id || 0;
    const data: string = query.data || "";

    if (data.startsWith('token_')) {
        selectedToken = data.substring(6);  // Remove 'token_' prefix
        calendar.startNavCalendar(query.message); // Start calendar after token selection
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        selectedDate = data;
        if (selectedToken) {
            await processPriceRequest(chatId, selectedToken, selectedDate);
            selectedToken = "";  // Reset after processing
            selectedDate = "";   // Reset after processing
        }
    } else {
        await bot.sendMessage(chatId, "Error: Invalid date format received. Please use YYYY-MM-DD.");
    }
});

export { bot };
