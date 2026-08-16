import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
  },
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      {
        find: /^@gym\/shared$/,
        replacement: path.resolve(__dirname, "./packages/shared/src/index.ts"),
      },
      {
        find: /^@gym\/shared\/(.*)$/,
        replacement: `${path.resolve(__dirname, "./packages/shared/src")}/$1.ts`,
      },
    ],
  },
});
