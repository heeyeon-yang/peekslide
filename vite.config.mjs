import { defineConfig } from "vite";
import { saveHandler } from "./scripts/save-handler.mjs";

const save = {
  name: "peekslide-save",
  apply: "serve",
  configureServer(server) {
    server.middlewares.use("/__save", saveHandler);
  },
};

export default defineConfig({
  plugins: [save],
  server: { watch: { ignored: ["**/data/decks.js", "**/projects/**"] } },
});
