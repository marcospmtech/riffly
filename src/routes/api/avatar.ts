// Rota que serve as fotos de avatar do bucket `avatars`.
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
            // Path reaproveitado no upsert; cache curto em vez de imutável.
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});
