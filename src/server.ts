// server.ts
import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import { bot } from './bot';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const token = process.env.TELEGRAM_BOT_TOKEN;

app.use(express.json());

// Handle updates from Telegram
app.post(`/bot${token}`, (req: Request, res: Response) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// GET route for the root to verify the server is running
app.get('/', (req: Request, res: Response) => {
    res.send('Hello from Telegram Bot Server!');
});

// Start Express server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
