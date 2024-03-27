import dotenv from 'dotenv';
import express from 'express';
import bodyParser from 'body-parser';
import { bot, processMessage } from './bot';

dotenv.config();

const app = express();
const token = process.env.TELEGRAM_BOT_TOKEN || '';

app.use(bodyParser.json());

const port = process.env.PORT || 3000;

app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  const webhookUrl = process.env.WEBHOOK_URL || '';
  
  try {
    await bot.setWebHook(`${webhookUrl}/bot${token}`);
    console.log('Webhook set');
  } catch (error) {
    console.error('Failed to set webhook', error);
  }
});

app.post(`/bot${token}`, (req, res) => {
  const update = req.body;
  if (update.message) {
    processMessage(update.message);
  }
  res.sendStatus(200);
});
