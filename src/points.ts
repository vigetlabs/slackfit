// points.ts
import * as storage from './storage';
import type { User } from './storage';
import { SCORING } from './scoring';

// --- Point Constants ---

// --- Check-in Logic ---

// Award points for a daily check-in (creates user if needed)
async function awardCheckIn(
  userId: string,
  date: string,
  hasMedia: boolean,
  userName?: string
): Promise<void> {
  // Only allow one check-in per day
  await storage.db.read();
  const alreadyCheckedIn = storage.db.data.checkIns.some((c: any) => c.user === userId && c.date === date);
  if (alreadyCheckedIn) return;
  await storage.logCheckIn({ user: userId, ts: Date.now().toString(), date, hasMedia });
}

// Award media bonus if not already given today (legacy, not used in new model)
async function awardMediaBonus(): Promise<void> {
  // No-op in new model, kept for compatibility
}

// --- Reaction Logic ---

// Award points for reactions (to both poster and reactor, unless self-reaction)
// Only up to SCORING.MAX_REACTION_POINTS points per check-in
async function awardReactionPoints(posterId: string, reactorId: string, checkInTs?: string): Promise<void> {
  // Do not award points for self-reactions
  if (posterId === reactorId) return;

  // Find the check-in for the poster (by ts if provided)
  await storage.db.read();
  let checkIn;
  if (checkInTs) {
    checkIn = storage.db.data.checkIns.find((c: any) => c.ts === checkInTs && c.user === posterId);
  } else {
    // fallback: most recent check-in for poster
    const checkIns = storage.db.data.checkIns.filter((c: any) => c.user === posterId);
    checkIn = checkIns[checkIns.length - 1];
  }
  if (!checkIn) return;

  // Award to post author (reactionsReceived)
  checkIn.reactionsReceived = (checkIn.reactionsReceived || 0) + 1;
  if (checkIn.reactionsReceived <= SCORING.MAX_REACTION_POINTS) {
    checkIn.legacyPoints = (checkIn.legacyPoints || 0) + SCORING.REACTION_POINT;
  }
  await storage.db.write();
}

// --- Streak Logic ---

// Calculate and award weekly streak bonuses for all users (legacy, not used in new model)
async function calculateWeeklyStreaks(): Promise<void> {
  // No-op in new model, kept for compatibility
}

// --- Exports ---

export { awardCheckIn, awardMediaBonus, awardReactionPoints, calculateWeeklyStreaks };
