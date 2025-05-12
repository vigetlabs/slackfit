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
  // Alice checks in every day with media
  for (const date of weekDates) {
    await points.awardCheckIn('U123', date, true);
  }
  // Bob checks in 3 days, no media
  for (const date of weekDates.slice(0, 3)) {
    await points.awardCheckIn('U456', date, false);
  }
  // Carol checks in 2 days, 1 with media
  await points.awardCheckIn('U789', weekDates[1], false);
  await points.awardCheckIn('U789', weekDates[3], true);

  // Simulate reactions
  await points.awardReactionPoints('U123', 'U456'); // Bob reacts to Alice
  await points.awardReactionPoints('U123', 'U789'); // Carol reacts to Alice
  await points.awardReactionPoints('U456', 'U123'); // Alice reacts to Bob

  // Calculate streaks
  await points.calculateWeeklyStreaks();

  // --- New tests for checkIn-based reactions and points ---
  await storage.db.read();
  const allCheckIns = storage.db.data.checkIns;
  // Find Alice's most recent check-in
  const aliceCheckIns = allCheckIns.filter((c: any) => c.user === 'U123');
  const aliceLastCheckIn = aliceCheckIns[aliceCheckIns.length - 1];
  console.log('Alice last check-in reactionsReceived:', aliceLastCheckIn.reactionsReceived);
  console.assert(typeof aliceLastCheckIn.reactionsReceived === 'number', 'reactionsReceived should be a number on checkIn');
  console.assert(aliceLastCheckIn.reactionsReceived > 0, 'Alice should have received reactions on her check-in');
  console.log('Alice last check-in legacyPoints:', aliceLastCheckIn.legacyPoints);
  console.assert(typeof aliceLastCheckIn.legacyPoints === 'number', 'legacyPoints should be a number on checkIn');

  // Ensure user object does NOT have reactionsReceived or legacyPoints
  // (No users object in DB anymore, so skip this check)

  // Weekly leaderboard
  const weekly = await leaderboard.getWeeklyLeaderboard();
  console.log('Weekly Leaderboard:');
  console.log(leaderboard.formatLeaderboard(weekly, 'week'));

  // Monthly leaderboard (simulate last 20 days)
  const monthDates: string[] = Array.from({ length: 20 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (19 - i));
    return d.toISOString().slice(0, 10);
  });
  const monthly = await leaderboard.getMonthlyLeaderboard();
  console.log('Monthly Leaderboard:');
  console.log(leaderboard.formatLeaderboard(monthly, 'month'));
}

runTests();
