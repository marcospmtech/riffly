import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const uploadSchema = z.object({
  filename: z.string().min(1),
  content_type: z.string().min(1),
  data_base64: z.string().min(1),
  folder: z.enum(["cifras", "capas"]).default("cifras"),
});

export const uploadChordImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => uploadSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: roles, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["admin", "owner"]);
    if (roleError) throw roleError;
    if (!roles || roles.length === 0) throw new Response("Forbidden", { status: 403 });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const ext = data.filename.split(".").pop() ?? "png";
    const path = `${data.folder}/${crypto.randomUUID()}.${ext}`;
    const buffer = Uint8Array.from(atob(data.data_base64), (c) => c.charCodeAt(0));

    const { error } = await supabaseAdmin.storage
      .from("chord-images")
      .upload(path, buffer, { contentType: data.content_type, upsert: false });
    if (error) throw error;

    return { path };
  });
