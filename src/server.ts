import dotenv from 'dotenv';
import express from 'express';
import bodyParser from 'body-parser';
import { bot } from './bot'; // Make sure this import path is correct

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const token = process.env.TELEGRAM_BOT_TOKEN;
const webhookUrl = process.env.WEBHOOK_URL; // Ensure this is set in your .env file

app.use(bodyParser.json());

// Set webhook on startup
bot.setWebHook(`${webhookUrl}/bot${token}`).then(() => {
    console.log('Webhook set successfully');
}).catch((error) => {
    console.error('Error setting webhook: ', error);
});

// Handle updates from Telegram
app.post(`/bot${token}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// Start Express server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

