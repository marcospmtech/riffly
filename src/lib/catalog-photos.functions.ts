// Server functions de fotos de autor/banda e álbum: listar com status de foto, enviar/substituir foto (staff).
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

async function requireStaffRole(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data: roles, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .in("role", ["admin", "owner"]);
  if (error) throw error;
  if (!roles || roles.length === 0) throw new Response("Forbidden", { status: 403 });
}

export interface AuthorEntry {
  name: string;
  image_path: string | null;
}

export interface AlbumEntry {
  name: string;
  author: string | null;
  image_path: string | null;
}

export const listAuthorPhotosCatalog = createServerFn({ method: "GET" }).handler(
  async (): Promise<AuthorEntry[]> => {
    const { createPublicClient } = await import("@/lib/songs.functions");
    const supabasePublic = await createPublicClient();

    const [{ data: songs, error: songsError }, { data: photos, error: photosError }] = await Promise.all([
      supabasePublic.from("songs").select("author"),
      supabasePublic.from("author_photos").select("name, image_path"),
    ]);
    if (songsError) throw songsError;
    if (photosError) throw photosError;

    const photoByName = new Map((photos ?? []).map((p) => [p.name, p.image_path]));
    const names = new Set<string>();
    for (const s of songs ?? []) if (s.author) names.add(s.author);

    return [...names].map((name) => ({ name, image_path: photoByName.get(name) ?? null }));
  },
);

export const listAlbumPhotosCatalog = createServerFn({ method: "GET" }).handler(
  async (): Promise<AlbumEntry[]> => {
    const { createPublicClient } = await import("@/lib/songs.functions");
    const supabasePublic = await createPublicClient();

    const [{ data: songs, error: songsError }, { data: photos, error: photosError }] = await Promise.all([
      supabasePublic.from("songs").select("album, author"),
      supabasePublic.from("album_photos").select("name, image_path"),
    ]);
    if (songsError) throw songsError;
    if (photosError) throw photosError;

    const photoByName = new Map((photos ?? []).map((p) => [p.name, p.image_path]));
    // Pega o primeiro autor encontrado para cada álbum (nome repetido = um só, com o autor da primeira ocorrência).
    const authorByAlbum = new Map<string, string>();
    for (const s of songs ?? []) {
      if (s.album && !authorByAlbum.has(s.album)) authorByAlbum.set(s.album, s.author);
    }

    return [...authorByAlbum.keys()].map((name) => ({
      name,
      author: authorByAlbum.get(name) ?? null,
      image_path: photoByName.get(name) ?? null,
    }));
  },
);

const IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

const upsertPhotoSchema = z.object({
  name: z.string().trim().min(1).max(200),
  content_type: z.enum(["image/png", "image/jpeg", "image/webp"]),
  data_base64: z.string().min(1),
});

async function hashName(name: string): Promise<string> {
  // Nome vira um hash hex em vez de ir direto no caminho do arquivo: o Storage
  // do Supabase rejeita vários caracteres (aspas, parênteses, etc.) comuns em
  // nome de banda/álbum (ex.: "Lynyrd Skynyrd" com apelido entre aspas), e
  // um hash é seguro independente do que o nome contenha.
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(name));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

async function upsertPhoto(table: "author_photos" | "album_photos", data: z.infer<typeof upsertPhotoSchema>) {
  const buffer = Uint8Array.from(atob(data.data_base64), (c) => c.charCodeAt(0));
  if (buffer.byteLength > MAX_PHOTO_BYTES) {
    throw new Response("Imagem muito grande (máx. 3MB)", { status: 400 });
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const ext = IMAGE_TYPES[data.content_type];
  // Caminho determinístico por nome (upsert) — substitui a foto anterior em vez de acumular lixo no bucket.
  const path = `${table}/${await hashName(data.name)}.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("catalog-photos")
    .upload(path, buffer, { contentType: data.content_type, upsert: true });
  if (uploadError) throw uploadError;

  const { error } = await supabaseAdmin.from(table).upsert({ name: data.name, image_path: path });
  if (error) throw error;

  return { image_path: path };
}

export const upsertAuthorPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => upsertPhotoSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireStaffRole(context);
    return upsertPhoto("author_photos", data);
  });

export const upsertAlbumPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => upsertPhotoSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireStaffRole(context);
    return upsertPhoto("album_photos", data);
  });
