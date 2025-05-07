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
function calculatePoints(user: User): number {
  const checkInPoints = (user.checkIns?.length || 0) * SCORING.DAILY_CHECKIN_POINTS;
  const mediaPoints = (user.mediaCheckIns?.length || 0) * SCORING.MEDIA_BONUS_POINTS;
  const reactionReceivedPoints = Math.min(
    (user.reactionsReceived || 0) * SCORING.REACTION_POINT,
    SCORING.MAX_REACTION_POINTS
  );
  const reactionGivenPoints = Math.min(
    (user.reactionsGiven || 0) * SCORING.REACTION_POINT,
    SCORING.MAX_REACTION_POINTS
  );
  return checkInPoints + mediaPoints + reactionReceivedPoints + reactionGivenPoints;
}

// Get the weekly leaderboard (total points for each user)
async function getWeeklyLeaderboard(): Promise<WeeklyLeaderboardEntry[]> {
  const users: Record<string, User> = await storage.getAllUsers();
  if (!users || Object.keys(users).length === 0) return [];
  const leaderboard: WeeklyLeaderboardEntry[] = Object.entries(users).map(([id, user]) => {
    return { id, name: user.name, weekPoints: calculatePoints(user) };
  });
  leaderboard.sort((a, b) => b.weekPoints - a.weekPoints);
  return leaderboard;
}

// Get the monthly leaderboard (total points for each user)
async function getMonthlyLeaderboard(): Promise<MonthlyLeaderboardEntry[]> {
  const users: Record<string, User> = await storage.getAllUsers();
  if (!users || Object.keys(users).length === 0) return [];
  const leaderboard: MonthlyLeaderboardEntry[] = Object.entries(users).map(([id, user]) => {
    return { id, name: user.name, monthPoints: calculatePoints(user) };
  });
  leaderboard.sort((a, b) => b.monthPoints - a.monthPoints);
  return leaderboard;
}

// Format the leaderboard for display in Slack
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
  respond
}: {
  ack: () => Promise<void>;
  respond: ({ text }: { text: string }) => Promise<void>;
}): Promise<void> {
  await ack();
  // For demo, use last 5 days for week, last 20 for month
  // const today = new Date();
  // const weekDates = Array.from({ length: 5 }, (_, i) => {
  //   const d = new Date(today);
  //   d.setDate(today.getDate() - i);
  //   return d.toISOString().slice(0, 10);
  // }).reverse();
  // const monthDates = Array.from({ length: 20 }, (_, i) => {
  //   const d = new Date(today);
  //   d.setDate(today.getDate() - i);
  //   return d.toISOString().slice(0, 10);
  // }).reverse();
  const weekly = await getWeeklyLeaderboard();
  const monthly = await getMonthlyLeaderboard();

  // If no data, show a single message
  if ((!weekly || weekly.length === 0) && (!monthly || monthly.length === 0)) {
    await respond({
      text: ':trophy: No leaderboard data available. No check-ins or points have been recorded yet!'
    });
    return;
  }

  // Otherwise, show both leaderboards
  const text = formatLeaderboard(weekly, 'week') + '\n' + formatLeaderboard(monthly, 'month');
  await respond({ text });
}

export { getWeeklyLeaderboard, getMonthlyLeaderboard, formatLeaderboard, handleLeaderboardCommand };
