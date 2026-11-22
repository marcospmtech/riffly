// Rota que serve as fotos de autor/álbum do bucket `catalog-photos`.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/catalog-photo")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const path = url.searchParams.get("path") ?? "";
        if (!path || path.includes("..")) {
          return new Response("Not found", { status: 404 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("catalog-photos").download(path);
        if (error || !data) {
          return new Response("Not found", { status: 404 });
        }

        return new Response(await data.arrayBuffer(), {
          headers: {
            "Content-Type": data.type || "image/png",
            "Cache-Control": "public, max-age=300",
          },
        });
      },
    },
  },
});
