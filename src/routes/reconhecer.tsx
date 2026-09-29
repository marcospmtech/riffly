import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState, useEffect } from "react";
import { Mic, Loader2, Music2, ExternalLink, Guitar } from "lucide-react";
import { recognizeSong, type RecognizeResult } from "@/lib/recognize.functions";

export const Route = createFileRoute("/reconhecer")({
  head: () => ({
    meta: [
      { title: "Reconhecer música — Riffly" },
      {
        name: "description",
        content: "Toque ou aproxime o celular da música e o Riffly identifica título, autor e álbum.",
      },
      { property: "og:title", content: "Reconhecer música — Riffly" },
      { property: "og:description", content: "Descubra qual música está tocando e vá direto para a cifra." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RecognizePage,
});

const RECORD_MS = 8000;

function RecognizePage() {
  const [state, setState] = useState<"idle" | "recording" | "processing">("idle");
  const [result, setResult] = useState<RecognizeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const start = async () => {
    setError(null);
    setResult(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Precisamos da permissão do microfone para reconhecer a música.");
      return;
    }
    streamRef.current = stream;
    setState("recording");

    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setState("processing");
      try {
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
        const res = await recognizeSong({
          data: { audio_base64: btoa(binary), content_type: blob.type || "audio/webm" },
        });
        setResult(res);
      } catch {
        setError("Não conseguimos processar o áudio. Tente novamente.");
      } finally {
        setState("idle");
      }
    };
    recorder.start();
    window.setTimeout(() => {
      if (recorder.state !== "inactive") recorder.stop();
    }, RECORD_MS);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-foreground">Reconhecer música</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Deixe a música tocando perto do microfone por alguns segundos.
      </p>

      <div className="mt-8 flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8">
        <button
          onClick={() => void start()}
          disabled={state !== "idle"}
          className="flex h-28 w-28 items-center justify-center rounded-full bg-riffly-purple text-white transition-transform hover:scale-105 disabled:opacity-70"
          aria-label="Reconhecer música"
        >
          {state === "idle" ? (
            <Mic className="h-12 w-12" />
          ) : (
            <Loader2 className="h-12 w-12 animate-spin" />
          )}
        </button>
        <p className="text-sm text-muted-foreground">
          {state === "recording"
            ? "Ouvindo..."
            : state === "processing"
              ? "Identificando a música..."
              : "Toque no botão e aguarde 8 segundos"}
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      {result && <ResultCard result={result} />}
    </div>
  );
}

function ResultCard({ result }: { result: RecognizeResult }) {
  if (result.status === "not_configured") {
    return (
      <div className="mt-6 rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        O reconhecimento de músicas ainda não está configurado. Fale com o administrador do site.
      </div>
    );
  }
  if (result.status === "not_found") {
    return (
      <div className="mt-6 rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Não reconhecemos essa música. Tente em um lugar mais silencioso ou com o volume mais alto.
      </div>
    );
  }
  if (result.status === "error") {
    return (
      <div className="mt-6 rounded-2xl border border-border bg-card p-6 text-center text-sm text-destructive">
        {result.message}
      </div>
    );
  }

  const { song } = result;
  return (
    <div className="mt-6 rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-background">
          {song.cover_url ? (
            <img src={song.cover_url} alt={`Capa de ${song.title}`} className="h-full w-full object-cover" />
          ) : (
            <Music2 className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-foreground">{song.title}</h2>
          <p className="text-sm text-muted-foreground">{song.author}</p>
          {song.album && <p className="text-xs text-muted-foreground">Álbum: {song.album}</p>}
        </div>
      </div>

      {song.youtube_id && (
        <div className="mt-4 aspect-video w-full overflow-hidden rounded-lg">
          <iframe
            src={`https://www.youtube.com/embed/${song.youtube_id}`}
            title={song.title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        {song.spotify_url && (
          <a
            href={song.spotify_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-riffly-purple px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            <ExternalLink className="h-4 w-4" /> Ouvir no Spotify
          </a>
        )}
        {song.local_song_id && (
          <Link
            to="/cifras/$id"
            params={{ id: song.local_song_id }}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:border-riffly-purple"
          >
            <Guitar className="h-4 w-4" /> Ver a cifra
          </Link>
        )}
      </div>
    </div>
  );
}
