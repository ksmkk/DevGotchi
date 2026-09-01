import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@apollo/client": fileURLToPath(
        new URL("./node_modules/@apollo/client", import.meta.url),
      ),
    },
  },
  server: {
    fs: { allow: [".."] },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
