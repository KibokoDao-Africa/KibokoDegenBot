// server.ts
import dotenv from 'dotenv';
import express, { Request, Response, NextFunction, Express } from 'express';
import { bot } from './bot.js'; // Ensure this path matches the location of your bot script

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000; // Handles the port setting for Railway or other platforms
const token = process.env.TELEGRAM_BOT_TOKEN;

// Properly configure bodyParser to parse JSON payloads
app.use(express.json());

// Handle updates from Telegram
app.post(`/bot${token}`, (req: Request, res: Response) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// Optional: GET route for the root to verify the server is running
app.get('/', (req: Request, res: Response) => {
    res.send('Hello from Telegram Bot Server!');
});

// Error handling middleware for handling Express errors
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Start Express server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// export { app }; // Exporting app for testing purposes
