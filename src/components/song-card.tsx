import { Link } from "@tanstack/react-router";
import { Music2, Guitar, Metronome, Heart } from "lucide-react";

export interface Song {
  id: string;
  title: string;
  author: string;
  album: string | null;
  bpm: number;
  tuning: string | null;
  youtube_url: string | null;
  spotify_url?: string | null;
  image_path: string | null;
  cover_path?: string | null;
  created_at: string;
  updated_at: string;
}

export function getSongImage(imagePath: string | null | undefined): string | undefined {
  if (!imagePath) return undefined;
  if (imagePath.startsWith("http")) return imagePath;
  return `/api/img?path=${encodeURIComponent(imagePath)}`;
}

export function SongCard({ song, favorite }: { song: Song; favorite?: boolean }) {
  const img = getSongImage(song.cover_path ?? null);
  return (
    <Link
      to="/cifras/$id"
      params={{ id: song.id }}
      className="group flex gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-riffly-purple"
    >
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-background">
        {img ? (
          <img src={img} alt={`Capa de ${song.title}`} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Music2 className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <div className="flex items-center gap-1">
          {favorite && <Heart className="h-3 w-3 shrink-0 fill-destructive text-destructive" />}
          <h3 className="truncate text-sm font-semibold text-foreground">{song.title}</h3>
        </div>
        <p className="truncate text-xs text-muted-foreground">{song.author}</p>
        <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {song.bpm > 0 && <span>{song.bpm} BPM</span>}
          {song.tuning && <span>· {song.tuning}</span>}
        </div>
      </div>
    </Link>
  );
}

export function ToolCard({
  to,
  icon: Icon,
  title,
  description,
}: {
  to: "/metronomo" | "/afinador" | "/afinador-manual" | "/reconhecer";
  icon: typeof Metronome;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center transition-all hover:border-riffly-purple hover:shadow-riffly"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-riffly-purple text-white">
        <Icon className="h-7 w-7" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}

export { Guitar, Metronome, Heart };
