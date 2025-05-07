// scheduler.js
import cron from 'node-cron';
// import { WebClient } from '@slack/web-api'; // Removed unused import
import dotenv from 'dotenv';
import { getDailyThreadMessage, getWeekendThreadMessage } from './messages';
dotenv.config();

// Helper to get ET time offset
function getETOffset(): number {
  const now = new Date();
  const jan = new Date(now.getFullYear(), 0, 1);
  const jul = new Date(now.getFullYear(), 6, 1);
  const stdTimezoneOffset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
  // ET is UTC-5 or UTC-4 (DST)
  return now.getTimezoneOffset() === stdTimezoneOffset ? -5 : -4;
}

// Convert ET hour/minute to UTC cron string
function etToUtcCron(minute: number, hour: number, dow: string | number): string {
  const offset = getETOffset();
  let utcHour = hour + offset;
  if (utcHour < 0) utcHour += 24;
  if (utcHour >= 24) utcHour -= 24;
  return `${minute} ${utcHour} * * ${dow}`;
}

interface ScheduleAllArgs {
  postThread: (text: string) => Promise<void>;
  postWeeklyLeaderboard: () => Promise<void>;
  postMonthlyLeaderboard: () => Promise<void>;
}

function scheduleAll({
  postThread,
  postWeeklyLeaderboard,
  postMonthlyLeaderboard
}: ScheduleAllArgs): void {
  // Weekdays 8am ET (Mon-Fri, dow 1-5)
  cron.schedule(etToUtcCron(0, 8, '1-5'), async () => {
    const text = getDailyThreadMessage();
    await postThread(text);
  });

  // Sunday 5pm ET (dow 0)
  cron.schedule(etToUtcCron(0, 17, 0), async () => {
    const text = getWeekendThreadMessage();
    await postThread(text);
  });

  // Monday 8am ET (weekly leaderboard, dow 1)
  cron.schedule(etToUtcCron(0, 8, 1), async () => {
    await postWeeklyLeaderboard();
  });

  // Last day of month 5pm ET
  cron.schedule('0 21 28-31 * *', async () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (tomorrow.getDate() === 1) {
      await postMonthlyLeaderboard();
    }
  });
}

export { scheduleAll };
