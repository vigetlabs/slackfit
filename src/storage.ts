// storage.ts
import path from 'path';

// --- Type Definitions ---

// User data structure for each Slack user
export interface User {
  name: string;
  checkIns: string[]; // Dates of check-ins
  mediaCheckIns: string[]; // Dates of check-ins with media
}

// CheckIn data structure for each valid check-in
export interface CheckIn {
  user: string;
  ts: string;
  date: string;
  hasMedia: boolean;
  reactions: string[];
  reactionsGiven?: number; // Number of reactions this check-in has given (optional, for future use)
  reactionsReceived?: number; // Number of reactions this check-in has received
  legacyPoints?: number; // Points for this check-in
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
  checkIns: CheckIn[];
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
  checkIns: [],
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

// --- Post and Reaction Functions ---

// Log a check-in in the database
async function logCheckIn({
  user,
  ts,
  date,
  hasMedia
}: {
  user: string;
  ts: string;
  date: string;
  hasMedia: boolean;
}): Promise<void> {
  await loadLowdb();
  await db.read();
  db.data.checkIns.push({
    user,
    ts,
    date,
    hasMedia,
    reactions: [],
    reactionsGiven: 0,
    reactionsReceived: 0,
    legacyPoints: 0
  });
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

// Get all check-ins for a specific date
async function getCheckInsByDate(date: string): Promise<CheckIn[]> {
  await loadLowdb();
  await db.read();
  return db.data.checkIns.filter((c: CheckIn) => c.date === date);
}

// --- Reset Functions ---

// Reset weekly data for all users
async function resetWeekly(): Promise<void> {
  await loadLowdb();
  await db.read();
  for (const user of Object.values(db.data.users) as User[]) {
    user.checkIns = [];
    user.mediaCheckIns = [];
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
  }
  await db.write();
}

// --- Exports ---

export {
  db,
  initDB,
  logCheckIn,
  logReaction,
  getCheckInsByDate,
  resetWeekly,
  resetMonthly
};
