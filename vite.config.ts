import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import viteTsConfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ command }) => ({
  appType: "custom",
  server: {
    port: 3000,
  },
  plugins: [
    tanstackStart({
      server: { entry: "server" },
    }),
    viteReact(),
    tailwindcss(),
    viteTsConfigPaths(),
    ...(command === "build" ? [nitro()] : []),
  ],
}));
