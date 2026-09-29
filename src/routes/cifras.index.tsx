import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useMutation } from "@tanstack/react-query";
import { listSongs } from "@/lib/songs.functions";
import { createSongRequest } from "@/lib/song-requests.functions";
import { SongCard, type Song } from "@/components/song-card";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/cifras/")({
  head: () => ({
    meta: [
      { title: "Cifras — Riffly" },
      { name: "description", content: "Explore a biblioteca de cifras Riffly com BPM e afinação pré-configurados." },
      { property: "og:title", content: "Cifras — Riffly" },
      { property: "og:description", content: "Biblioteca de cifras Riffly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CifrasPage,
});

const songsQuery = queryOptions({
  queryKey: ["songs"],
  queryFn: () => listSongs(),
});

function CifrasPage() {
  const { data: songs } = useSuspenseQuery(songsQuery);
  const [q, setQ] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("q") ?? "";
  });

  const filtered = (songs as Song[]).filter((s) => {
    if (!q.trim()) return true;
    const t = q.toLowerCase();
    return s.title.toLowerCase().includes(t) || s.author.toLowerCase().includes(t);
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cifras</h1>
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

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">Nenhuma música encontrada.</p>
          <RequestSongBlock initialTitle={q.trim()} />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((song) => (
            <SongCard key={song.id} song={song} />
          ))}
        </div>
      )}
    </div>
  );
}

function RequestSongBlock({ initialTitle }: { initialTitle: string }) {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-8">
      <p className="text-sm font-medium text-foreground">Não encontrou a música desejada?</p>
      {isAuthenticated ? (
        <button
          onClick={() => setOpen(true)}
          className="mt-3 inline-flex items-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Pedir música
        </button>
      ) : (
        <Link
          to="/auth"
          className="mt-3 inline-flex items-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Entrar para pedir música
        </Link>
      )}

      {open && <RequestDialog initialTitle={initialTitle} onClose={() => setOpen(false)} />}
    </div>
  );
}

function RequestDialog({ initialTitle, onClose }: { initialTitle: string; onClose: () => void }) {
  const [title, setTitle] = useState(initialTitle);
  const [author, setAuthor] = useState("");

  const mutation = useMutation({
    mutationFn: () => createSongRequest({ data: { title: title.trim(), author: author.trim() } }),
    onSuccess: () => {
      toast.success("Pedido enviado! Vamos avaliar em breve.");
      onClose();
    },
    onError: () => toast.error("Não conseguimos enviar seu pedido. Tente novamente."),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-left">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Pedir música</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-background" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Nome da música</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Autor</label>
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              maxLength={200}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-background"
          >
            Cancelar
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !title.trim() || !author.trim()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {mutation.isPending ? "Enviando..." : "Enviar pedido"}
          </button>
        </div>
      </div>
    </div>
  );
}
