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
  let user: User | undefined = await storage.getUser(userId);
  if (!user) {
    user = {
      name: userName || userId,
      checkIns: [],
      mediaCheckIns: [],
      reactionsGiven: 0,
      reactionsReceived: 0,
      legacyPoints: 0
    };
  }
  // Only allow one check-in per day
  if (user.checkIns.includes(date)) return;

  user.checkIns.push(date);
  if (hasMedia) {
    user.mediaCheckIns.push(date);
  }
  // Optionally, update legacyPoints for reference
  user.legacyPoints =
    (user.legacyPoints || 0) +
    SCORING.DAILY_CHECKIN_POINTS +
    (hasMedia ? SCORING.MEDIA_BONUS_POINTS : 0);
  await storage.setUser(userId, user);
}

// Award media bonus if not already given today (legacy, not used in new model)
async function awardMediaBonus(): Promise<void> {
  // No-op in new model, kept for compatibility
}

// --- Reaction Logic ---

// Award points for reactions (to both poster and reactor, unless self-reaction)
// Only up to SCORING.MAX_REACTION_POINTS points per user
async function awardReactionPoints(posterId: string, reactorId: string): Promise<void> {
  // Do not award points for self-reactions
  if (posterId === reactorId) return;

  const poster: User | undefined = await storage.getUser(posterId);
  const reactor: User | undefined = await storage.getUser(reactorId);

  if (!poster && !reactor) return;

  // Award to post author (reactionsReceived)
  if (poster) {
    poster.reactionsReceived = (poster.reactionsReceived || 0) + 1;
    // Optionally, update legacyPoints for reference
    if (poster.reactionsReceived <= SCORING.MAX_REACTION_POINTS) {
      poster.legacyPoints = (poster.legacyPoints || 0) + SCORING.REACTION_POINT;
    }
    await storage.setUser(posterId, poster);
  }

  // Award to reactor (reactionsGiven)
  if (reactor) {
    reactor.reactionsGiven = (reactor.reactionsGiven || 0) + 1;
    // Optionally, update legacyPoints for reference
    if (reactor.reactionsGiven <= SCORING.MAX_REACTION_POINTS) {
      reactor.legacyPoints = (reactor.legacyPoints || 0) + SCORING.REACTION_POINT;
    }
    await storage.setUser(reactorId, reactor);
  }
}

// --- Streak Logic ---

// Calculate and award weekly streak bonuses for all users (legacy, not used in new model)
async function calculateWeeklyStreaks(): Promise<void> {
  // No-op in new model, kept for compatibility
}

// --- Exports ---

export { awardCheckIn, awardMediaBonus, awardReactionPoints, calculateWeeklyStreaks };
