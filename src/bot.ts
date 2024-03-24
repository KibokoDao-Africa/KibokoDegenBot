import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN || '';
const bot = new TelegramBot(token, { polling: true });

interface PredictedPriceResponse {
  predictedPrice: number;
}

interface AxiosError {
  response?: {
    data: {
      message: string;
    };
  };
}

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || '';

  if (text.startsWith('/price')) {
    const args = text.split(' ');
    if (args.length < 3) {
      bot.sendMessage(chatId, 'Usage: /price [token] [date]');
      return;
    }

    const [_, tokenName, date] = args;
    const apiUrl = `${process.env.PYTHON_API_URL}?token=${encodeURIComponent(tokenName)}&date=${encodeURIComponent(date)}`;

    axios.get<PredictedPriceResponse>(apiUrl)
      .then(response => {
        const predictedPrice = response.data.predictedPrice;
        bot.sendMessage(chatId, `Predicted closing price for ${tokenName} on ${date}: ${predictedPrice}`);
      })
      .catch((error: AxiosError) => {
        console.error(error);
        let errorMessage = 'Sorry, there was an error processing your request.';
        if (error.response && error.response.data) {
          errorMessage += ` Error: ${error.response.data.message}`;
        }
        bot.sendMessage(chatId, errorMessage);
      });
  }
});

console.log('Bot started...');
