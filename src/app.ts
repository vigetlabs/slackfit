// app.ts
import dotenv from 'dotenv';
dotenv.config();
import { App, SlackEvent, ReactionAddedEvent } from '@slack/bolt';
import * as storage from './storage';
import * as points from './points';
import * as leaderboard from './leaderboard';
import { scheduleAll } from './scheduler';

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

const channel: string | undefined = process.env.EXERCISE_CHANNEL_ID;

// Cache the bot's user ID for thread validation
let botUserId: string | undefined;

// Fetch and cache the bot's user ID from Slack
async function fetchBotUserId(): Promise<string> {
  if (botUserId) return botUserId;
  const auth = await app.client.auth.test();
  if (!auth.user_id) throw new Error('Could not fetch bot user ID');
  botUserId = auth.user_id;
  return botUserId;
}

// Check if a message is a reply in the exercise thread
function isThreadReply(message: SlackEvent): boolean {
  return (
    typeof (message as any).channel === 'string' &&
    'thread_ts' in message &&
    typeof (message as any).thread_ts === 'string' &&
    'text' in message &&
    typeof (message as any).text === 'string'
  );
}

// Check if a message contains an image or video
function hasMedia(message: SlackEvent): boolean {
  return (
    'files' in message &&
    Array.isArray((message as any).files) &&
    (message as any).files.some(
      (f: { mimetype: string }) => f.mimetype.startsWith('image/') || f.mimetype.startsWith('video/')
    )
  );
}

// Check if a message contains a Slack @ mention
function containsMention(text: string | undefined): boolean {
  return !!text && text.includes('<@');
}

// Fetch a user's real name from Slack
async function getSlackUserName(userId: string): Promise<string> {
  try {
    const result = await app.client.users.info({ user: userId });
    return result.user?.real_name || result.user?.name || userId;
  } catch (e) {
    return userId;
  }
}

// Handle replies in the exercise thread (check-ins and comments)
app.event('message', async ({ event }: { event: SlackEvent }) => {
  if (!isThreadReply(event)) return;
  const botId = await fetchBotUserId();
  const replies = await app.client.conversations.replies({
    channel: (event as any).channel,
    ts: (event as any).thread_ts
  });
  const parent = replies.messages && replies.messages[0];
  const parentDate =
    parent && parent.ts
      ? new Date(Number(parent.ts.split('.')[0]) * 1000).toISOString().slice(0, 10)
      : new Date(Number((event as any).ts.split('.')[0]) * 1000).toISOString().slice(0, 10);
  if (containsMention((event as any).text)) {
    await storage.logPost({
      user: (event as any).user,
      ts: (event as any).ts,
      date: parentDate,
      hasMedia: hasMedia(event),
      isCheckIn: false
    });
    return;
  }
  if (!parent || parent.user !== botId) {
    await storage.logPost({
      user: (event as any).user,
      ts: (event as any).ts,
      date: parentDate,
      hasMedia: hasMedia(event),
      isCheckIn: false
    });
    return;
  }
  const userName = await getSlackUserName((event as any).user);
  await points.awardCheckIn((event as any).user, parentDate, hasMedia(event), userName);
  await storage.logPost({
    user: (event as any).user,
    ts: (event as any).ts,
    date: parentDate,
    hasMedia: hasMedia(event),
    isCheckIn: true
  });
});

// Handle reactions to posts (only valid check-ins can earn reaction points)
app.event('reaction_added', async ({ event }: { event: ReactionAddedEvent }) => {
  // event.item.ts is the post timestamp being reacted to
  const postTs = event.item.ts;
  const posts = await storage.db.read().then(() => storage.db.data.posts);
  const post = posts.find((p: any) => p.ts === postTs);
  if (!post) return; // No matching post found
  if (!post.isCheckIn) return; // Only award points for reactions to check-ins
  await points.awardReactionPoints(post.user, event.user);
  await storage.logReaction({ user: post.user, postTs, reactor: event.user, ts: event.event_ts });
});

// Register the /whiteboard command to show the leaderboard
app.command('/whiteboard', leaderboard.handleLeaderboardCommand);

// Post a new daily thread in the exercise channel
async function postThread(text: string): Promise<void> {
  if (!channel) throw new Error('EXERCISE_CHANNEL_ID is not set');
  await app.client.chat.postMessage({ channel, text });
}

// Post the weekly leaderboard and reset weekly data
async function postWeeklyLeaderboard(): Promise<void> {
  if (!channel) throw new Error('EXERCISE_CHANNEL_ID is not set');
  await points.calculateWeeklyStreaks();
  const board = await leaderboard.getWeeklyLeaderboard();
  const text = leaderboard.formatLeaderboard(board, 'week');
  await app.client.chat.postMessage({ channel, text });
  await storage.resetWeekly();
}

// Post the monthly leaderboard and reset monthly data
async function postMonthlyLeaderboard(): Promise<void> {
  if (!channel) throw new Error('EXERCISE_CHANNEL_ID is not set');
  // Use last 20 days as month for demo
  const board = await leaderboard.getMonthlyLeaderboard();
  const text = leaderboard.formatLeaderboard(board, 'month');
  await app.client.chat.postMessage({ channel, text });
  await storage.resetMonthly();
}

// Initialize storage and start the app
(async () => {
  await storage.initDB();
  scheduleAll({ postThread, postWeeklyLeaderboard, postMonthlyLeaderboard });
  const PORT = process.env.PORT ? Number(process.env.PORT) : 5173;
  await app.start(PORT);
  console.log('⚡️ SlackFit app is running!');
})();

// (Optional) Catch-all event logger for debugging (can be removed in production)
// app.event(/.*/, async ({ event }) => {
//   console.log('DEBUG: Any event received:', JSON.stringify(event, null, 2));
// });
