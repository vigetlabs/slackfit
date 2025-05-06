// test.js
import * as storage from './storage';
import * as points from './points';
import * as leaderboard from './leaderboard';

async function runTests(): Promise<void> {
  await storage.initDB();
  // Simulate 3 users posting on different days
  const today = new Date();
  // Simulate Mon-Fri
  const weekDates: string[] = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (4 - i));
    return d.toISOString().slice(0, 10);
  });
  // Alice posts every day with media
  for (const date of weekDates) {
    await points.awardCheckIn('U123', date, true);
  }
  // Bob posts 3 days, no media
  for (const date of weekDates.slice(0, 3)) {
    await points.awardCheckIn('U456', date, false);
  }
  // Carol posts 2 days, 1 with media
  await points.awardCheckIn('U789', weekDates[1], false);
  await points.awardCheckIn('U789', weekDates[3], true);

  // Simulate reactions
  await points.awardReactionPoints('U123', 'U456'); // Bob reacts to Alice
  await points.awardReactionPoints('U123', 'U789'); // Carol reacts to Alice
  await points.awardReactionPoints('U456', 'U123'); // Alice reacts to Bob

  // Calculate streaks
  await points.calculateWeeklyStreaks(weekDates);

  // Weekly leaderboard
  const weekly = await leaderboard.getWeeklyLeaderboard(weekDates);
  console.log('Weekly Leaderboard:');
  console.log(leaderboard.formatLeaderboard(weekly, 'week'));

  // Monthly leaderboard (simulate last 20 days)
  const monthDates: string[] = Array.from({ length: 20 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (19 - i));
    return d.toISOString().slice(0, 10);
  });
  const monthly = await leaderboard.getMonthlyLeaderboard(monthDates);
  console.log('Monthly Leaderboard:');
  console.log(leaderboard.formatLeaderboard(monthly, 'month'));
}

runTests();
