import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "edge-runtime",
    include: ["**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, ".."),
    },
  },
});
