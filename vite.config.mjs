import fs from "node:fs";
import { defineConfig } from "vite";
import { saveHandler } from "./dev/save-handler.mjs";

// dev 전용 플러그인: 편집기(JS/CSS) 주입 + 저장 API(/__save).
// apply:"serve" 라서 빌드/배포 경로에는 절대 관여하지 않는다.
const editor = {
  name: "peekslide-editor",
  apply: "serve",
  configureServer(server) {
    server.middlewares.use("/__save", saveHandler);
  },
  transformIndexHtml() {
    const tags = [{ tag: "script", attrs: { src: "/dev/edit.js" }, injectTo: "body" }];
    if (fs.existsSync("dev/edit.css"))
      tags.unshift({ tag: "link", attrs: { rel: "stylesheet", href: "/dev/edit.css" }, injectTo: "head" });
    return tags;
  },
};

export default defineConfig({
  plugins: [editor],
  server: { watch: { ignored: ["**/data/decks.js", "**/projects/**"] } },
});
