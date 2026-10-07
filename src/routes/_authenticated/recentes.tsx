import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import { listAllRecents } from "@/lib/favorites.functions";
import { SongListPage } from "@/components/song-list-page";
import type { Song } from "@/components/song-card";

export const Route = createFileRoute("/_authenticated/recentes")({
  head: () => ({
    meta: [
      { title: "Recentes — Riffly" },
      { name: "description", content: "Todas as cifras que você visualizou recentemente no Riffly." },
    ],
  }),
  component: RecentesPage,
});

function RecentesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["recents", "all"],
    queryFn: () => listAllRecents(),
  });
  const songs = ((data ?? []) as (Song | null)[]).filter((s): s is Song => !!s);

  return (
    <SongListPage
      title="Recentes"
      icon={<Clock className="h-7 w-7 text-primary" />}
      songs={songs}
      isLoading={isLoading}
      emptyMessage="Nenhuma música vista ainda."
    />
  );
}
