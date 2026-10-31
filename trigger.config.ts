import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  project: "proj_rgxrelefbxnlezsytdzk",
  runtime: "node",
  logLevel: "log",
  // Max run time in seconds for every task (can be overridden per task)
  maxDuration: 3600,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["./src/trigger"],
});
