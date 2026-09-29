import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient, useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useEffect } from "react";
import { Heart, Metronome, Guitar, ArrowLeft } from "lucide-react";
import { getSong } from "@/lib/songs.functions";
import { addFavorite, removeFavorite, addRecent, listFavorites } from "@/lib/favorites.functions";
import { useAuth } from "@/hooks/use-auth";
import { getSongImage } from "@/components/song-card";
import { toast } from "sonner";

export const Route = createFileRoute("/cifras/$id")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(songQueryOpts(params.id)),
  head: () => ({
    meta: [
      { title: "Cifra da música — Riffly" },
      { name: "description", content: "Veja a cifra, o vídeo, o BPM e a afinação da música no Riffly." },
      { property: "og:title", content: "Cifra da música — Riffly" },
      { property: "og:description", content: "Veja a cifra, o vídeo, o BPM e a afinação da música no Riffly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CifraDetailPage,
});

const songQueryOpts = (id: string) =>
  queryOptions({
    queryKey: ["song", id],
    queryFn: () => getSong({ data: { id } }),
  });

function getYouTubeId(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/))([\w-]{11})/);
  return m ? m[1]! : null;
}

function CifraDetailPage() {
  const { id } = Route.useParams();
  const { data: song } = useSuspenseQuery(songQueryOpts(id));
  const { isAuthenticated } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      void addRecent({ data: { song_id: id } }).then(() => {
        void qc.invalidateQueries({ queryKey: ["recents"] });
      });
    }
  }, [id, isAuthenticated, qc]);

  const { data: favs } = useQuery({
    queryKey: ["favorites"],
    queryFn: () => listFavorites(),
    enabled: isAuthenticated,
  });
  const isFav = !!favs?.some((f: any) => f?.id === id);

  const favMutation = useMutation({
    mutationFn: async () => {
      if (isFav) return removeFavorite({ data: { song_id: id } });
      return addFavorite({ data: { song_id: id } });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["favorites"] });
      toast.success(isFav ? "Removido dos favoritos" : "Adicionado aos favoritos");
    },
  });

  const ytId = getYouTubeId(song.youtube_url);
  const img = getSongImage(song.image_path);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/cifras" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{song.title}</h1>
          <p className="mt-1 text-muted-foreground">{song.author}{song.album ? ` · ${song.album}` : ""}</p>
        </div>
        {isAuthenticated && (
          <button
            onClick={() => favMutation.mutate()}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:border-riffly-purple"
          >
            <Heart className={`h-4 w-4 ${isFav ? "fill-destructive text-destructive" : ""}`} />
            {isFav ? "Favoritado" : "Favoritar"}
          </button>
        )}
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={() => navigate({ to: "/metronomo", search: { bpm: song.bpm } })}
          className="inline-flex items-center gap-2 rounded-lg bg-riffly-purple px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          <Metronome className="h-4 w-4" /> Metrônomo · {song.bpm} BPM
        </button>
        <button
          onClick={() => navigate({ to: "/afinador-manual", search: { tuning: song.tuning } })}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:border-riffly-purple"
        >
          <Guitar className="h-4 w-4" /> Afinação · {song.tuning}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Cifra</h2>
          {img ? (
            <img src={img} alt={`Cifra de ${song.title}`} className="w-full rounded-lg" />
          ) : (
            <div className="flex h-64 items-center justify-center rounded-lg bg-background text-muted-foreground">
              Sem imagem da cifra
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Vídeo</h2>
          {ytId ? (
            <div className="aspect-video w-full overflow-hidden rounded-lg">
              <iframe
                src={`https://www.youtube.com/embed/${ytId}`}
                title={song.title}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-lg bg-background text-muted-foreground">
              Sem vídeo
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
