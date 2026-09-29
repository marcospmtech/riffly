import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface SongRequest {
  id: string;
  title: string;
  author: string;
  requester_name: string | null;
  requester_email: string | null;
  created_at: string;
}

const requestSchema = z.object({
  title: z.string().trim().min(1).max(200),
  author: z.string().trim().min(1).max(200),
});

const idSchema = z.object({ id: z.string().uuid() });

async function requireStaff(context: {
  supabase: SupabaseClient<Database>;
  userId: string;
}) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .in("role", ["admin", "owner"]);
  if (error) throw error;
  if (!data || data.length === 0) throw new Response("Forbidden", { status: 403 });
}

export const createSongRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => requestSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", context.userId)
      .maybeSingle();

    const email = (context.claims as { email?: string } | null)?.email ?? null;

    const { error } = await context.supabase.from("song_requests").insert({
      user_id: context.userId,
      title: data.title,
      author: data.author,
      requester_name: profile?.display_name ?? null,
      requester_email: email,
    });
    if (error) throw error;
    return { ok: true };
  });

export const listSongRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SongRequest[]> => {
    await requireStaff(context);
    const { data, error } = await context.supabase
      .from("song_requests")
      .select("id, title, author, requester_name, requester_email, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const deleteSongRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireStaff(context);
    const { error } = await context.supabase.from("song_requests").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
