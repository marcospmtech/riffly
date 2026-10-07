import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const favoriteSchema = z.object({ song_id: z.string().uuid() });

export const listFavorites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("favorites")
      .select("song_id, song:songs(*)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((f) => f.song);
  });

export const addFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => favoriteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("favorites")
      .insert({ user_id: context.userId, song_id: data.song_id });
    if (error) throw error;
    return { ok: true };
  });

export const removeFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => favoriteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("favorites")
      .delete()
      .eq("user_id", context.userId)
      .eq("song_id", data.song_id);
    if (error) throw error;
    return { ok: true };
  });

export const listRecents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("recents")
      .select("song_id, viewed_at, song:songs(*)")
      .eq("user_id", context.userId)
      .order("viewed_at", { ascending: false })
      .limit(12);
    if (error) throw error;
    return (data ?? []).map((r) => ({ ...r.song, viewed_at: r.viewed_at }));
  });

export const listAllRecents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("recents")
      .select("song_id, viewed_at, song:songs(*)")
      .eq("user_id", context.userId)
      .order("viewed_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return (data ?? []).map((r) => ({ ...r.song, viewed_at: r.viewed_at }));
  });

export const addRecent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => favoriteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("recents")
      .upsert(
        { user_id: context.userId, song_id: data.song_id, viewed_at: new Date().toISOString() },
        { onConflict: "user_id,song_id" },
      );
    if (error) throw error;
    return { ok: true };
  });
