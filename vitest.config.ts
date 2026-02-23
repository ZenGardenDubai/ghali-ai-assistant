import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "edge-runtime",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules/**"],
    setupFiles: ["./convex/vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
