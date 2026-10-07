import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { listFavorites } from "@/lib/favorites.functions";
import { SongListPage } from "@/components/song-list-page";
import type { Song } from "@/components/song-card";

export const Route = createFileRoute("/_authenticated/favoritos")({
  head: () => ({
    meta: [
      { title: "Favoritos — Riffly" },
      { name: "description", content: "Todas as cifras que você favoritou no Riffly." },
    ],
  }),
  component: FavoritosPage,
});

function FavoritosPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["favorites"],
    queryFn: () => listFavorites(),
  });
  const songs = ((data ?? []) as (Song | null)[]).filter((s): s is Song => !!s);

  return (
    <SongListPage
      title="Favoritos"
      icon={<Heart className="h-7 w-7 text-destructive" />}
      songs={songs}
      isLoading={isLoading}
      emptyMessage="Nenhuma música favoritada ainda."
      favorite
    />
  );
}
