import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@apollo/client": fileURLToPath(
        new URL("./node_modules/@apollo/client", import.meta.url),
      ),
      react: fileURLToPath(new URL("./node_modules/react", import.meta.url)),
      "react-dom": fileURLToPath(
        new URL("./node_modules/react-dom", import.meta.url),
      ),
    },
    dedupe: ["react", "react-dom"],
  },
  server: {
    host: "127.0.0.1",
    hmr: { host: "127.0.0.1" },
  },
});
