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

// Daily cleanup of expired incoming media files from storage
crons.daily(
  "media-file-cleanup",
  { hourUTC: 1, minuteUTC: 30 },
  internal.mediaStorage.cleanupExpiredMediaFiles
);

// Hourly heartbeat check — runs at :00 every hour, evaluates pro users' reminders
crons.cron(
  "heartbeat-check",
  "0 * * * *",
  internal.heartbeat.processHeartbeats
);

export default crons;
