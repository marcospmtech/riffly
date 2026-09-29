import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const recognizeSchema = z.object({
  audio_base64: z.string().min(100),
  content_type: z.string().min(1).default("audio/webm"),
});

export interface RecognizedSong {
  title: string;
  author: string;
  album: string | null;
  youtube_id: string | null;
  cover_url: string | null;
  spotify_url: string | null;
  local_song_id: string | null;
}

export type RecognizeResult =
  | { status: "ok"; song: RecognizedSong }
  | { status: "not_found" }
  | { status: "not_configured" }
  | { status: "error"; message: string };

async function signAcr(stringToSign: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(stringToSign));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

export const recognizeSong = createServerFn({ method: "POST" })
  .inputValidator((input) => recognizeSchema.parse(input))
  .handler(async ({ data }): Promise<RecognizeResult> => {
    const host = process.env["ACRCLOUD_HOST"];
    const accessKey = process.env["ACRCLOUD_ACCESS_KEY"];
    const accessSecret = process.env["ACRCLOUD_ACCESS_SECRET"];
    if (!host || !accessKey || !accessSecret) return { status: "not_configured" };

    const bytes = Uint8Array.from(atob(data.audio_base64), (c) => c.charCodeAt(0));
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const stringToSign = ["POST", "/v1/identify", accessKey, "audio", "1", timestamp].join("\n");
    const signature = await signAcr(stringToSign, accessSecret);

    const form = new FormData();
    form.append("sample", new Blob([bytes], { type: data.content_type }), "sample.webm");
    form.append("sample_bytes", String(bytes.byteLength));
    form.append("access_key", accessKey);
    form.append("data_type", "audio");
    form.append("signature_version", "1");
    form.append("signature", signature);
    form.append("timestamp", timestamp);

    const endpoint = host.startsWith("http") ? `${host}/v1/identify` : `https://${host}/v1/identify`;

    let payload: any;
    try {
      const res = await fetch(endpoint, { method: "POST", body: form });
      payload = await res.json();
    } catch (e) {
      console.error("ACRCloud request failed", e);
      return { status: "error", message: "Não conseguimos falar com o serviço de reconhecimento." };
    }

    const code = payload?.status?.code;
    if (code === 1001) return { status: "not_found" };
    if (code !== 0) {
      console.error("ACRCloud error", payload?.status);
      return { status: "error", message: payload?.status?.msg ?? "Falha no reconhecimento." };
    }

    const music = payload?.metadata?.music?.[0];
    if (!music) return { status: "not_found" };

    const title: string = music.title ?? "";
    const author: string = music.artists?.[0]?.name ?? "";
    const album: string | null = music.album?.name ?? null;
    const youtubeId: string | null = music.external_metadata?.youtube?.vid ?? null;
    const spotifyId: string | undefined = music.external_metadata?.spotify?.track?.id;

    let localSongId: string | null = null;
    let localCoverUrl: string | null = null;
    try {
      const { createClient } = await import("@supabase/supabase-js");
      type Database = import("@/integrations/supabase/types").Database;
      const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
      const client = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
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
      const { data: matches } = await client
        .from("songs")
        .select("id, title, author, cover_path")
        .ilike("title", title)
        .limit(5);
      const match = matches?.[0] ?? null;
      localSongId = match?.id ?? null;
      if (match?.cover_path) {
        localCoverUrl = `/api/img?path=${encodeURIComponent(match.cover_path)}`;
      }
    } catch (e) {
      console.error("local song lookup failed", e);
    }

    return {
      status: "ok",
      song: {
        title,
        author,
        album,
        youtube_id: youtubeId,
        cover_url: localCoverUrl ?? (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : null),
        spotify_url: spotifyId
          ? `https://open.spotify.com/track/${spotifyId}`
          : `https://open.spotify.com/search/${encodeURIComponent(`${title} ${author}`)}`,
        local_song_id: localSongId,
      },
    };
  });
