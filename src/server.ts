import dotenv from 'dotenv'; // Ensure dotenv is imported
import express from 'express';
import bodyParser from 'body-parser';
import ngrok from 'ngrok';
import { bot, processMessage } from './bot'; // Import bot and processMessage

dotenv.config();

const app = express();
app.use(bodyParser.json()); // For parsing application/json

const port = process.env.PORT || 3000;

// Start the Express server
app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  const ngrokUrl = await ngrok.connect(port);
  console.log(`Server exposed through ngrok at ${ngrokUrl}`);

  // Set the bot's webhook URL to ngrok URL
  bot.setWebHook(`${ngrokUrl}/bot${process.env.TELEGRAM_BOT_TOKEN}`);
});

// Endpoint to receive updates from Telegram
app.post(`/bot${process.env.TELEGRAM_BOT_TOKEN}`, (req, res) => {
  const update = req.body;
  if (update.message) {
    processMessage(update.message);
  }
  res.sendStatus(200); // Responding to Telegram to acknowledge receipt of the update
});
