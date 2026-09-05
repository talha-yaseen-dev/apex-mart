import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Node unit tests don't touch CSS; skip the project's Tailwind v4 PostCSS
  // config, which Vite's loader can't parse.
  css: { postcss: { plugins: [] } },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
  resolve: {
    alias: {
      // Neutralize the RSC-only guard so server modules import under Node.
      "server-only": path.resolve(root, "test/stubs/server-only.ts"),
      "@": root,
    },
  },
});
