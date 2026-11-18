// Server functions de perfil: ler perfil público, listar/buscar perfis, editar perfil, enviar/remover avatar.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const userIdSchema = z.object({ user_id: z.string().uuid() });

export interface PublicProfile {
  user_id: string;
  display_name: string | null;
  bio: string | null;
  avatar_path: string | null;
  favorite_author: string | null;
  favorite_album: string | null;
  favorite_song: {
    id: string;
    title: string;
    author: string;
    album: string | null;
    cover_path: string | null;
  } | null;
}

// Via supabaseAdmin (profiles não tem SELECT público); só retorna os campos pensados pra ser públicos.
export const getPublicProfile = createServerFn({ method: "GET" })
  .inputValidator((input) => userIdSchema.parse(input))
  .handler(async ({ data }): Promise<PublicProfile> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select(
        "user_id, display_name, bio, avatar_path, favorite_author, favorite_album, favorite_song:songs(id, title, author, album, cover_path)",
      )
      .eq("user_id", data.user_id)
      .maybeSingle();
    if (error) throw error;
    if (!profile) throw new Response("Perfil não encontrado", { status: 404 });

    return profile as unknown as PublicProfile;
  });

const searchSchema = z.object({ search: z.string().trim().max(100).optional() });

export interface ProfileListItem {
  user_id: string;
  display_name: string | null;
  avatar_path: string | null;
}

// Lista para a página /usuarios; via supabaseAdmin, só os 3 campos públicos.
export const listPublicProfiles = createServerFn({ method: "GET" })
  .inputValidator((input) => searchSchema.parse(input ?? {}))
  .handler(async ({ data }): Promise<ProfileListItem[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("profiles")
      .select("user_id, display_name, avatar_path")
      .order("display_name")
      .limit(60);

    const term = data.search?.trim();
    if (term) {
      const escaped = term.replace(/[%_]/g, (m) => `\\${m}`);
      query = query.ilike("display_name", `%${escaped}%`);
    }

    const { data: rows, error } = await query;
    if (error) throw error;
    return rows ?? [];
  });

const updateProfileSchema = z.object({
  display_name: z.string().trim().min(1).max(60),
  bio: z.string().trim().max(280).nullable().optional(),
  favorite_song_id: z.string().uuid().nullable().optional(),
  favorite_author: z.string().trim().min(1).max(200).nullable().optional(),
  favorite_album: z.string().trim().min(1).max(200).nullable().optional(),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => updateProfileSchema.parse(input))
  .handler(async ({ data, context }) => {
    // Valida de novo no servidor que autor/álbum/música existem no catálogo.
    if (data.favorite_author) {
      const { data: match, error } = await context.supabase
        .from("songs")
        .select("id")
        .ilike("author", data.favorite_author)
        .limit(1);
      if (error) throw error;
      if (!match || match.length === 0) {
        throw new Response("Autor/banda não encontrado no catálogo", { status: 400 });
      }
    }
    if (data.favorite_album) {
      const { data: match, error } = await context.supabase
        .from("songs")
        .select("id")
        .ilike("album", data.favorite_album)
        .limit(1);
      if (error) throw error;
      if (!match || match.length === 0) {
        throw new Response("Álbum não encontrado no catálogo", { status: 400 });
      }
    }
    if (data.favorite_song_id) {
      const { data: match, error } = await context.supabase
        .from("songs")
        .select("id")
        .eq("id", data.favorite_song_id)
        .limit(1);
      if (error) throw error;
      if (!match || match.length === 0) {
        throw new Response("Música não encontrada no catálogo", { status: 400 });
      }
    }

    const { error } = await context.supabase
      .from("profiles")
      .update({
        display_name: data.display_name,
        bio: data.bio ?? null,
        favorite_song_id: data.favorite_song_id ?? null,
        favorite_author: data.favorite_author ?? null,
        favorite_album: data.favorite_album ?? null,
      })
      .eq("user_id", context.userId);
    if (error) throw error;

    return { ok: true };
  });

const IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

// Limite de 3MB decodificado para a imagem de avatar.
const MAX_AVATAR_BYTES = 3 * 1024 * 1024;

const uploadAvatarSchema = z.object({
  content_type: z.enum(["image/png", "image/jpeg", "image/webp"]),
  data_base64: z.string().min(1),
});

export const uploadAvatar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => uploadAvatarSchema.parse(input))
  .handler(async ({ data, context }) => {
    const buffer = Uint8Array.from(atob(data.data_base64), (c) => c.charCodeAt(0));
    if (buffer.byteLength > MAX_AVATAR_BYTES) {
      throw new Response("Imagem muito grande (máx. 3MB)", { status: 400 });
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Caminho determinístico por usuário (upsert) — substitui o avatar anterior em vez de acumular.
    const ext = IMAGE_TYPES[data.content_type];
    const path = `${context.userId}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("avatars")
      .upload(path, buffer, { contentType: data.content_type, upsert: true });
    if (uploadError) throw uploadError;

    const { error: updateError } = await context.supabase
      .from("profiles")
      .update({ avatar_path: path })
      .eq("user_id", context.userId);
    if (updateError) throw updateError;

    return { avatar_path: path };
  });

export const removeAvatar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile, error: readError } = await context.supabase
      .from("profiles")
      .select("avatar_path")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (readError) throw readError;

    if (profile?.avatar_path) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // Best effort: ignora se o arquivo já não existir.
      await supabaseAdmin.storage.from("avatars").remove([profile.avatar_path]);
    }

    const { error } = await context.supabase
      .from("profiles")
      .update({ avatar_path: null })
      .eq("user_id", context.userId);
    if (error) throw error;

    return { ok: true };
  });
