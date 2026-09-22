import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    hookTimeout: 30000,
    testTimeout: 30000,
    // Integration tests share one database and call resetDatabase() between
    // tests; running test files in parallel would let one file's reset wipe
    // out another file's in-flight data. Unit tests are fast enough that
    // serializing them too costs nothing noticeable.
    fileParallelism: false,
  },
});
