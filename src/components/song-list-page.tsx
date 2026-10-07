import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { SongCard, type Song } from "@/components/song-card";

/**
 * Lista de músicas no mesmo formato da página "Cifras" (título, contador, busca e grade de cards).
 * Usada pelas páginas de Favoritos e Recentes.
 */
export function SongListPage({
  title,
  icon,
  songs,
  isLoading,
  emptyMessage,
  favorite,
}: {
  title: string;
  icon?: ReactNode;
  songs: Song[];
  isLoading?: boolean;
  emptyMessage: string;
  favorite?: boolean;
}) {
  const [q, setQ] = useState("");

  const filtered = songs.filter((s) => {
    if (!q.trim()) return true;
    const t = q.toLowerCase();
    return s.title.toLowerCase().includes(t) || s.author.toLowerCase().includes(t);
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-foreground">
            {icon} {title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{filtered.length} música(s)</p>
        </div>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por título ou autor..."
          className="h-10 w-full max-w-xs rounded-full border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">{q.trim() ? "Nenhuma música encontrada." : emptyMessage}</p>
          {!q.trim() && (
            <Link
              to="/cifras"
              className="mt-4 inline-flex items-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Explorar cifras
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((song) => (
            <SongCard key={song.id} song={song} favorite={favorite} />
          ))}
        </div>
      )}
    </div>
  );
}
