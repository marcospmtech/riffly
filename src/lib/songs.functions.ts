import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const songSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  album: z.string().nullable().optional(),
  bpm: z.number().int().min(1).max(500).default(120),
  tuning: z.string().min(1).default("E A D G B E"),
  youtube_url: z.string().url().nullable().optional(),
  spotify_url: z.string().url().nullable().optional(),
  image_path: z.string().nullable().optional(),
  image_paths: z.array(z.string().min(1)).max(30).optional(),
  cover_path: z.string().nullable().optional(),
});

const songIdSchema = z.object({ id: z.string().uuid() });

function normalizeSongInput(data: z.infer<typeof songSchema>) {
  // A ordem do array é a ordem em que as imagens são exibidas.
  // `image_path` continua sendo gravado com a 1ª imagem, por compatibilidade.
  const imagePaths =
    data.image_paths ?? (data.image_path ? [data.image_path] : []);
  return {
    ...data,
    album: data.album ?? null,
    youtube_url: data.youtube_url ?? null,
    spotify_url: data.spotify_url ?? null,
    image_paths: imagePaths,
    image_path: imagePaths[0] ?? null,
    cover_path: data.cover_path ?? null,
  };
}

async function createPublicClient() {
  const { createClient } = await import("@supabase/supabase-js");
  type Database = import("@/integrations/supabase/types").Database;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const listSongs = createServerFn({ method: "GET" }).handler(async () => {
  const supabasePublic = await createPublicClient();
  const { data, error } = await supabasePublic.from("songs").select("*").order("title");
  if (error) throw error;
  return data ?? [];
});

export const getSong = createServerFn({ method: "GET" })
  .inputValidator((input) => songIdSchema.parse(input))
  .handler(async ({ data }) => {
    const supabasePublic = await createPublicClient();
    const { data: song, error } = await supabasePublic.from("songs").select("*").eq("id", data.id).single();
    if (error) throw error;
    return song;
  });

export const createSong = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => songSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: roleData, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["admin", "owner"]);
    if (roleError) throw roleError;
    if (!roleData || roleData.length === 0) throw new Response("Forbidden", { status: 403 });

    const payload = normalizeSongInput(data);
    const { data: song, error } = await context.supabase.from("songs").insert(payload).select().single();
    if (error) throw error;
    return song;
  });

export const updateSong = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.intersection(z.object({ id: z.string().uuid() }), songSchema).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const { data: roleData, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["admin", "owner"]);
    if (roleError) throw roleError;
    if (!roleData || roleData.length === 0) throw new Response("Forbidden", { status: 403 });

    const payload = normalizeSongInput(rest);
    const { data: song, error } = await context.supabase.from("songs").update(payload).eq("id", id).select().single();
    if (error) throw error;
    return song;
  });

export const deleteSong = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => songIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: roleData, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["admin", "owner"]);
    if (roleError) throw roleError;
    if (!roleData || roleData.length === 0) throw new Response("Forbidden", { status: 403 });

    const { error } = await context.supabase.from("songs").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
