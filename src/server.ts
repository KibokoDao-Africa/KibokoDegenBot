import dotenv from 'dotenv'; // Ensure dotenv is imported
import express from 'express';
import bodyParser from 'body-parser';
import { bot, processMessage } from './bot'; // Import bot and processMessage

dotenv.config();

const app = express();
app.use(bodyParser.json()); // For parsing application/json

const port = process.env.PORT || 3000;

// Start the Express server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  
  // Assuming you have an environment variable for your webhook URL
  const webhookUrl = process.env.WEBHOOK_URL || 'your-external-ngrok-url-retrieval-mechanism';
  
  // Construct the complete webhook URL
  const completeWebhookUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`;
  
  // Set the webhook for the bot
  bot.setWebHook(completeWebhookUrl);
});

// Endpoint to receive updates from Telegram
app.post(`/bot${process.env.TELEGRAM_BOT_TOKEN}`, (req, res) => {
  const update = req.body;
  if (update.message) {
    processMessage(update.message);
  }
  res.sendStatus(200); // Responding to Telegram to acknowledge receipt of the update
});
