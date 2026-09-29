// Configuração manual do Vite/TanStack Start, sem depender do pacote da Lovable
// (@lovable.dev/vite-tanstack-config).
//
// IMPORTANTE: o plugin nitro() tem um bug conhecido (TanStack/router #5877,
// #7717 e outras) que quebra TODO o roteamento em modo `vite dev` no Windows —
// qualquer rota vira "Cannot GET /...". Ele só deve entrar durante o BUILD de
// produção (`vite build`), nunca durante o dev. Por isso a config é uma
// função: ela recebe o "command" (dev ou build) e só inclui o nitro() quando
// for build.
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
    // Só entra no build de produção — em dev ele quebra o roteamento (bug
    // conhecido do nitro + TanStack Start no Windows).
    ...(command === "build" ? [nitro()] : []),
  ],
}));
