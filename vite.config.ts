import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import webExtension from "vite-plugin-web-extension";
import { copyFileSync, mkdirSync } from "fs";
import { join } from "path";

export default defineConfig({
  base: "",
  plugins: [
    webExtension({
      manifest: "manifest.json",
      additionalInputs: [],
      htmlViteConfig: {
        plugins: [tailwindcss(), react()],
      },
    }),
    {
      name: "copy-icons",
      writeBundle() {
        try {
          const sourceDir = "icons";
          const destDir = join("dist", "icons");
          mkdirSync(destDir, { recursive: true });
          copyFileSync(join(sourceDir, "icon.svg"), join(destDir, "icon.svg"));
          console.log("✅ Icons copied to dist/");
        } catch (err) {
          console.error("❌ Failed to copy icons:", err);
        }
      },
    },
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
  },
});
