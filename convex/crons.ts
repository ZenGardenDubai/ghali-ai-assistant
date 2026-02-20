import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daily credit reset — checks all users and resets those past their reset date
crons.daily(
  "credit-reset",
  { hourUTC: 0, minuteUTC: 0 },
  internal.credits.resetCredits
);

// Daily cleanup of expired generated images from storage
crons.daily(
  "image-cleanup",
  { hourUTC: 1, minuteUTC: 0 },
  internal.imageStorage.cleanupExpiredImages
);

export default crons;
