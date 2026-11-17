import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/avatar")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const path = url.searchParams.get("path") ?? "";
        if (!path || path.includes("..") || path.includes("/")) {
          return new Response("Not found", { status: 404 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("avatars").download(path);
        if (error || !data) {
          return new Response("Not found", { status: 404 });
        }

        return new Response(await data.arrayBuffer(), {
          headers: {
            "Content-Type": data.type || "image/png",
            // Diferente de /api/img, esse cache não é "immutable": o mesmo
            // path (userId.ext) é reaproveitado quando a pessoa troca de
            // foto (upsert), então o navegador precisa checar de novo em
            // vez de confiar pra sempre no primeiro avatar que baixou.
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});
