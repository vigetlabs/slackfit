// storage.ts
import path from 'path';

// --- Type Definitions ---

// User data structure for each Slack user
export interface User {
  name: string;
  checkIns: string[]; // Dates of check-ins
  mediaCheckIns: string[]; // Dates of check-ins with media
  reactionsGiven: number; // Number of reactions this user has given
  reactionsReceived: number; // Number of reactions this user has received
  legacyPoints?: number; // For reference only (legacy)
}

// Post data structure for each thread reply
export interface Post {
  user: string;
  ts: string;
  date: string;
  hasMedia: boolean;
  isCheckIn: boolean; // True if this post is a valid check-in
  reactions: string[];
}

// Reaction data structure for each reaction event
export interface Reaction {
  user: string;
  postTs: string;
  reactor: string;
  ts: string;
}

// Main database structure
export interface DBData {
  users: Record<string, User>;
  posts: Post[];
  reactions: Reaction[];
}

// --- Lowdb Setup ---

let Low: any;
let JSONFile: any;

// Dynamically import lowdb and its node adapter
async function loadLowdb(): Promise<void> {
  if (!Low) {
    const lowdb = await import('lowdb');
    Low = lowdb.Low;
  }
  if (!JSONFile) {
    const node = await import('lowdb/node');
    JSONFile = node.JSONFile;
  }
}

// Always use db.json in the project root
const dbFile = path.join(process.cwd(), 'db.json');
let adapter: any, db: any;

// Use sample data only in test mode, otherwise start with empty users
const isTest = process.env.NODE_ENV === 'test' || process.env.USE_SAMPLE_DATA === 'true';

const defaultData: DBData = {
  users: isTest
    ? {
        U123: {
          name: 'Alice',
          checkIns: [],
          mediaCheckIns: [],
          reactionsGiven: 0,
          reactionsReceived: 0,
          legacyPoints: 0
        },
        U456: {
          name: 'Bob',
          checkIns: [],
          mediaCheckIns: [],
          reactionsGiven: 0,
          reactionsReceived: 0,
          legacyPoints: 0
        },
        U789: {
          name: 'Carol',
          checkIns: [],
          mediaCheckIns: [],
          reactionsGiven: 0,
          reactionsReceived: 0,
          legacyPoints: 0
        }
      }
    : {},
  posts: [],
  reactions: []
};

// Initialize the database, creating it if it doesn't exist
async function initDB(): Promise<void> {
  await loadLowdb();
  if (!adapter) adapter = new JSONFile(dbFile);
  if (!db) db = new Low(adapter, defaultData);
  await db.read();
  if (!db.data) {
    db.data = defaultData;
    await db.write();
  }
}

// --- User Functions ---

// Get a user by Slack user ID
async function getUser(userId: string): Promise<User | undefined> {
  await loadLowdb();
  await db.read();
  return db.data.users[userId];
}

// Set or update a user by Slack user ID
async function setUser(userId: string, userData: User): Promise<void> {
  await loadLowdb();
  await db.read();
  db.data.users[userId] = userData;
  await db.write();
}

// --- Post and Reaction Functions ---

// Log a post (check-in or comment) in the database
async function logPost({
  user,
  ts,
  date,
  hasMedia,
  isCheckIn
}: {
  user: string;
  ts: string;
  date: string;
  hasMedia: boolean;
  isCheckIn: boolean;
}): Promise<void> {
  await loadLowdb();
  await db.read();
  db.data.posts.push({ user, ts, date, hasMedia, isCheckIn, reactions: [] });
  await db.write();
}

// Log a reaction event in the database
async function logReaction({
  user,
  postTs,
  reactor,
  ts
}: {
  user: string;
  postTs: string;
  reactor: string;
  ts: string;
}): Promise<void> {
  await loadLowdb();
  await db.read();
  db.data.reactions.push({ user, postTs, reactor, ts });
  await db.write();
}

// Get all posts for a specific date
async function getPostsByDate(date: string): Promise<Post[]> {
  await loadLowdb();
  await db.read();
  return db.data.posts.filter((p: Post) => p.date === date);
}

// Get all users in the database
async function getAllUsers(): Promise<Record<string, User>> {
  await loadLowdb();
  await db.read();
  return db.data.users;
}

// --- Reset Functions ---

// Reset weekly data for all users
async function resetWeekly(): Promise<void> {
  await loadLowdb();
  await db.read();
  for (const user of Object.values(db.data.users) as User[]) {
    user.checkIns = [];
    user.mediaCheckIns = [];
    user.reactionsGiven = 0;
    user.reactionsReceived = 0;
  }
  await db.write();
}

// Reset monthly data for all users
async function resetMonthly(): Promise<void> {
  await loadLowdb();
  await db.read();
  for (const user of Object.values(db.data.users) as User[]) {
    user.checkIns = [];
    user.mediaCheckIns = [];
    user.reactionsGiven = 0;
    user.reactionsReceived = 0;
  }
  await db.write();
}

// --- Exports ---

export {
  db,
  initDB,
  getUser,
  setUser,
  logPost,
  logReaction,
  getPostsByDate,
  getAllUsers,
  resetWeekly,
  resetMonthly
};
