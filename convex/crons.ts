import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daily credit reset — checks all users and resets those past their reset date
crons.daily(
  "credit-reset",
  { hourUTC: 0, minuteUTC: 0 },
  internal.credits.resetCredits
);

export default crons;
