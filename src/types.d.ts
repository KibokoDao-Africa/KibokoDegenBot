// src/types.d.ts

declare module 'telegram-inline-calendar' {
    import TelegramBot from 'node-telegram-bot-api';

    export interface CalendarOptions {
        date_format: string;
        language: string;
        bot_api?: 'telebot' | 'node-telegram-bot-api';
    }

    export class Calendar {
        constructor(bot: TelegramBot, options: CalendarOptions);
        startNavCalendar(msg: any): void;
        clickButtonCalendar(query: any): string | -1;
    }
}
