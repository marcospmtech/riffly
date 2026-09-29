import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { Guitar, Metronome, Sliders, Music2, Heart, Clock, Mic } from "lucide-react";
import { listSongs } from "@/lib/songs.functions";
import { listFavorites, listRecents } from "@/lib/favorites.functions";
import { useAuth } from "@/hooks/use-auth";
import { SongCard, ToolCard, type Song } from "@/components/song-card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Riffly — Afinador, Metrônomo e Cifras" },
      { name: "description", content: "Riffly é o site unificado de afinador, metrônomo e biblioteca de cifras para músicos." },
      { property: "og:title", content: "Riffly — Afinador, Metrônomo e Cifras" },
      { property: "og:description", content: "Riffly é o site unificado de afinador, metrônomo e biblioteca de cifras para músicos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const songsQuery = queryOptions({
  queryKey: ["songs"],
  queryFn: () => listSongs(),
});

function HomePage() {
  const { isAuthenticated } = useAuth();
  const { data: songs } = useSuspenseQuery(songsQuery);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-foreground sm:text-5xl">
          Tudo para o músico,{" "}
          <span className="text-primary">num só lugar</span>
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground">
          Afinador cromático, afinador manual, metrônomo e biblioteca de cifras.
        </p>
      </div>

      {/* Tools */}
      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ToolCard to="/metronomo" icon={Metronome} title="Metrônomo" description="BPM configurável com subdivisões" />
        <ToolCard to="/afinador" icon={Guitar} title="Afinador cromático" description="Detecção de nota em tempo real" />
        <ToolCard to="/afinador-manual" icon={Sliders} title="Afinador manual" description="Aperte ou solte a tarraxa" />
        <ToolCard to="/reconhecer" icon={Mic} title="Reconhecer música" description="Descubra o que está tocando" />
      </div>

      {/* Recent & Favorites */}
      {isAuthenticated ? (
        <div className="grid gap-8 lg:grid-cols-2">
          <FavoritesSection />
          <RecentSection />
        </div>
      ) : (
        <div className="mb-10 rounded-2xl border border-border bg-card p-6 text-center">
          <Music2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Faça login para salvar favoritos</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie uma conta para favoritar músicas e acessar seu histórico.
          </p>
          <Link
            to="/auth"
            className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Entrar
          </Link>
        </div>
      )}

      {/* Browse all songs */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Explorar cifras</h2>
        <Link to="/cifras" className="text-sm font-medium text-primary hover:underline">
          Ver todas →
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {songs.slice(0, 6).map((song) => (
          <SongCard key={song.id} song={song as Song} />
        ))}
      </div>
      {songs.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">Nenhuma música ainda.</p>
      )}
    </div>
  );
}

function FavoritesSection() {
  const { data } = useQuery({
    queryKey: ["favorites"],
    queryFn: () => listFavorites(),
    enabled: true,
  });
  const songs = (data ?? []) as Song[];
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
        <Heart className="h-5 w-5 text-destructive" /> Favoritos
      </h2>
      {songs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma música favoritada ainda.</p>
      ) : (
        <div className="grid gap-2">
          {songs.slice(0, 4).map((s) => (
            <SongCard key={s.id} song={s} favorite />
          ))}
        </div>
      )}
    </div>
  );
}

function RecentSection() {
  const { data } = useQuery({
    queryKey: ["recents"],
    queryFn: () => listRecents(),
    enabled: true,
  });
  const songs = (data ?? []) as Song[];
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
        <Clock className="h-5 w-5 text-primary" /> Recentes
      </h2>
      {songs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma música vista ainda.</p>
      ) : (
        <div className="grid gap-2">
          {songs.slice(0, 4).map((s) => (
            <SongCard key={s.id} song={s} />
          ))}
        </div>
      )}
    </div>
  );
}
