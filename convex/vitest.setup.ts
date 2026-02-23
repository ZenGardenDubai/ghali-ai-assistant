/**
 * Suppress "Write outside of transaction" unhandled rejections from convex-test.
 *
 * When mutations use ctx.scheduler.runAfter, convex-test tries to write to
 * _scheduled_functions after the test transaction ends. This is harmless but
 * causes unhandled rejections that fail CI with exit code 1.
 */
process.on("unhandledRejection", (reason) => {
  if (
    reason instanceof Error &&
    reason.message.includes("Write outside of transaction")
  ) {
    // Silently ignore — known convex-test limitation
    return;
  }
  // Re-throw anything else so real errors still fail tests
  throw reason;
});
