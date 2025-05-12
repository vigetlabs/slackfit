import * as storage from './storage';
import type { User } from './storage';
import { SCORING } from './scoring';

// --- Leaderboard Entry Types ---

// Entry for the weekly leaderboard
interface WeeklyLeaderboardEntry {
  id: string;
  name: string;
  weekPoints: number;
}

// Entry for the monthly leaderboard
interface MonthlyLeaderboardEntry {
  id: string;
  name: string;
  monthPoints: number;
}

// Calculate total points for a user based on their actions
function calculatePoints(userId: string, allCheckIns: any[]): number {
  // Get all check-ins for this user
  const userCheckIns = allCheckIns.filter((c) => c.user === userId);
  // Sum legacyPoints and reactionsReceived from check-ins
  let checkInPoints = 0;
  let mediaPoints = 0;
  let reactionPoints = 0;
  for (const checkIn of userCheckIns) {
    checkInPoints += SCORING.DAILY_CHECKIN_POINTS;
    if (checkIn.hasMedia) mediaPoints += SCORING.MEDIA_BONUS_POINTS;
    reactionPoints += Math.min((checkIn.reactionsReceived || 0) * SCORING.REACTION_POINT, SCORING.MAX_REACTION_POINTS);
  }
  return checkInPoints + mediaPoints + reactionPoints;
}

// Get the weekly leaderboard (total points for each user)
async function getWeeklyLeaderboard(): Promise<WeeklyLeaderboardEntry[]> {
  const allCheckIns = await storage.db.read().then(() => storage.db.data.checkIns);
  // Get unique user IDs from checkIns
  const userIds = Array.from(new Set(allCheckIns.map((c: any) => c.user))) as string[];
  const leaderboard: WeeklyLeaderboardEntry[] = userIds.map((id: string) => {
    return { id, name: id, weekPoints: calculatePoints(id, allCheckIns) };
  });
  leaderboard.sort((a, b) => b.weekPoints - a.weekPoints);
  return leaderboard;
}

// Get the monthly leaderboard (total points for each user)
async function getMonthlyLeaderboard(): Promise<MonthlyLeaderboardEntry[]> {
  const allCheckIns = await storage.db.read().then(() => storage.db.data.checkIns);
  const userIds = Array.from(new Set(allCheckIns.map((c: any) => c.user))) as string[];
  const leaderboard: MonthlyLeaderboardEntry[] = userIds.map((id: string) => {
    return { id, name: id, monthPoints: calculatePoints(id, allCheckIns) };
  });
  leaderboard.sort((a, b) => b.monthPoints - a.monthPoints);
  return leaderboard;
}

// Helper to fetch user names from Slack
async function getUserNamesFromSlack(userIds: string[], slackClient: any): Promise<Record<string, string>> {
  const names: Record<string, string> = {};
  for (const userId of userIds) {
    try {
      const result = await slackClient.users.info({ user: userId });
      names[userId] = result.user?.real_name || result.user?.name || userId;
    } catch (e) {
      names[userId] = userId;
    }
  }
  return names;
}

// Format the leaderboard for display in Slack, using real names
async function formatLeaderboardWithNames(
  leaderboard: (WeeklyLeaderboardEntry | MonthlyLeaderboardEntry)[],
  slackClient: any,
  period: 'week' | 'month' = 'week'
): Promise<string> {
  if (!leaderboard || leaderboard.length === 0)
    return ':hourglass_flowing_sand: No leaderboard data available. No check-ins or points have been recorded yet!';
  const userIds = leaderboard.map((u) => u.id);
  const names = await getUserNamesFromSlack(userIds, slackClient);
  let text = `:trophy: *${period === 'week' ? 'Weekly' : 'Monthly'} Leaderboard* :trophy:\n`;
  leaderboard.forEach((u, i) => {
    const displayName = names[u.id] || u.id;
    text += `*${i + 1}. ${displayName}* - ${period === 'week' ? (u as WeeklyLeaderboardEntry).weekPoints : (u as MonthlyLeaderboardEntry).monthPoints} points\n`;
  });
  return text;
}

// Fallback: Format the leaderboard for display in Slack using user IDs
function formatLeaderboard(
  leaderboard: (WeeklyLeaderboardEntry | MonthlyLeaderboardEntry)[],
  period: 'week' | 'month' = 'week'
): string {
  if (!leaderboard || leaderboard.length === 0)
    return ':hourglass_flowing_sand: No leaderboard data available. No check-ins or points have been recorded yet!';
  let text = `:trophy: *${period === 'week' ? 'Weekly' : 'Monthly'} Leaderboard* :trophy:\n`;
  leaderboard.forEach((u, i) => {
    text += `*${i + 1}. ${u.name}* - ${period === 'week' ? (u as WeeklyLeaderboardEntry).weekPoints : (u as MonthlyLeaderboardEntry).monthPoints} points\n`;
  });
  return text;
}

// Handler for /whiteboard slash command
// Responds with both weekly and monthly leaderboards, or a single message if no data
async function handleLeaderboardCommand({
  ack,
  respond,
  client
}: {
  ack: () => Promise<void>;
  respond: ({ text }: { text: string }) => Promise<void>;
  client: any;
}): Promise<void> {
  await ack();
  const weekly = await getWeeklyLeaderboard();
  const monthly = await getMonthlyLeaderboard();

  // If no data, show a single message
  if ((!weekly || weekly.length === 0) && (!monthly || monthly.length === 0)) {
    await respond({
      text: ':trophy: No leaderboard data available. No check-ins or points have been recorded yet!'
    });
    return;
  }

  // Otherwise, show both leaderboards with real names
  const text = await formatLeaderboardWithNames(weekly, client, 'week') + '\n' + await formatLeaderboardWithNames(monthly, client, 'month');
  await respond({ text });
}

export { getWeeklyLeaderboard, getMonthlyLeaderboard, formatLeaderboard, formatLeaderboardWithNames, handleLeaderboardCommand };
