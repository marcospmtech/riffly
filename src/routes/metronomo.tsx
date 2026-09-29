import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Square, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/metronomo")({
  validateSearch: (search: Record<string, unknown>) => ({
    bpm: typeof search["bpm"] === "number" ? search["bpm"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Metrônomo — Riffly" },
      { name: "description", content: "Metrônomo configurável com subdivisões de tempo, BPM de 40 a 220 e beats por compasso." },
      { property: "og:title", content: "Metrônomo — Riffly" },
      { property: "og:description", content: "Metrônomo configurável para Riffly." },
    ],
  }),
  component: MetronomoPage,
});

const MIN_BPM = 40;
const MAX_BPM = 220;

const SUBDIVISIONS = [
  { label: "1/4 (bater)", value: 1 },
  { label: "1/8 (colcheias)", value: 2 },
  { label: "1/8T (tercina)", value: 3 },
  { label: "1/16 (semicolcheias)", value: 4 },
];

function MetronomoPage() {
  const navigate = useNavigate();
  const initialBpm = Number(Route.useSearch().bpm ?? 60);

  const [bpm, setBpm] = useState(initialBpm);
  const [beatsPerBar, setBeatsPerBar] = useState(4);
  const [subdivision, setSubdivision] = useState(1);
  const [volume, setVolume] = useState(0.7);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(-1);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef(0);
  const beatCounterRef = useRef(0);
  const schedulerIdRef = useRef<number | null>(null);
  const bpmRef = useRef(bpm);
  const beatsPerBarRef = useRef(beatsPerBar);
  const subdivisionRef = useRef(subdivision);
  const volumeRef = useRef(volume);

  bpmRef.current = bpm;
  beatsPerBarRef.current = beatsPerBar;
  subdivisionRef.current = subdivision;
  volumeRef.current = volume;

  const scheduleAheadTime = 0.1;
  const lookahead = 25;

  const playClick = useCallback((time: number, accent: boolean) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const freq = accent ? 1200 : 800;
    osc.frequency.setValueAtTime(freq, time);
    const v = volumeRef.current;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(v * (accent ? 1 : 0.6), time + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.start(time);
    osc.stop(time + 0.05);
  }, []);

  const scheduler = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const secondsPerBeat = 60.0 / bpmRef.current;
    const secondsPerSub = secondsPerBeat / subdivisionRef.current;

    while (nextNoteTimeRef.current < ctx.currentTime + scheduleAheadTime) {
      const beatIndex = beatCounterRef.current;
      const subIndex = beatIndex % subdivisionRef.current;
      const isMain = subIndex === 0;
      const barBeat = Math.floor(beatIndex / subdivisionRef.current) % beatsPerBarRef.current;
      const accent = isMain && barBeat === 0;

      playClick(nextNoteTimeRef.current, accent);

      if (isMain) {
        const beatNum = barBeat + 1;
        const delay = Math.max(0, (nextNoteTimeRef.current - ctx.currentTime) * 1000);
        window.setTimeout(() => setCurrentBeat(beatNum), delay);
      }

      nextNoteTimeRef.current += secondsPerSub;
      beatCounterRef.current++;
    }

    schedulerIdRef.current = window.setTimeout(scheduler, lookahead);
  }, [playClick]);

  const start = useCallback(() => {
    if (audioCtxRef.current?.state === "suspended") {
      audioCtxRef.current?.resume();
    }
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    beatCounterRef.current = 0;
    nextNoteTimeRef.current = audioCtxRef.current.currentTime + 0.05;
    setIsPlaying(true);
    setCurrentBeat(-1);
    scheduler();
  }, [scheduler]);

  const stop = useCallback(() => {
    if (schedulerIdRef.current) {
      clearTimeout(schedulerIdRef.current);
      schedulerIdRef.current = null;
    }
    setIsPlaying(false);
    setCurrentBeat(-1);
  }, []);

  useEffect(() => {
    return () => {
      if (schedulerIdRef.current) clearTimeout(schedulerIdRef.current);
      audioCtxRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const timeout = setTimeout(() => {
      if (beatCounterRef.current % subdivisionRef.current === 0) {
        const barBeat = Math.floor(beatCounterRef.current / subdivisionRef.current) % beatsPerBarRef.current;
        setCurrentBeat(barBeat + 1);
      }
    }, 0);
    return () => clearTimeout(timeout);
  }, [isPlaying, subdivision, beatsPerBar]);

  const totalClicks = beatsPerBar * subdivision;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Metrônomo</h1>
        <p className="mt-1 text-sm text-muted-foreground">Toque com precisão e ritmo.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-riffly sm:p-8">
        {/* Visual indicator */}
        <div className="mb-8 flex justify-center gap-2">
          {Array.from({ length: beatsPerBar }).map((_, i) => {
            const isActive = isPlaying && currentBeat === i + 1;
            return (
              <div
                key={i}
                className={`h-4 w-4 rounded-full transition-colors duration-100 ${
                  isActive ? "bg-primary" : i === 0 ? "bg-riffly-purple" : "bg-border"
                }`}
              />
            );
          })}
        </div>

        {/* BPM display */}
        <div className="mb-6 text-center">
          <div className="text-7xl font-bold tabular-nums text-foreground">
            {bpm}
          </div>
          <div className="text-sm text-muted-foreground">BPM</div>
        </div>

        {/* BPM slider */}
        <div className="mb-6">
          <input
            type="range"
            min={MIN_BPM}
            max={MAX_BPM}
            step={1}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border accent-primary"
          />
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>{MIN_BPM}</span>
            <span>{MAX_BPM}</span>
          </div>
        </div>

        {/* BPM quick buttons */}
        <div className="mb-6 flex flex-wrap justify-center gap-2">
          {[60, 80, 100, 120, 140, 160, 180].map((v) => (
            <button
              key={v}
              onClick={() => setBpm(v)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                bpm === v
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="mb-6 flex justify-center gap-3">
          <button
            onClick={isPlaying ? stop : start}
            className={`flex h-16 w-16 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 ${
              isPlaying ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"
            }`}
            aria-label={isPlaying ? "Parar" : "Iniciar"}
          >
            {isPlaying ? <Square className="h-7 w-7" /> : <Play className="h-7 w-7" />}
          </button>
          <button
            onClick={() => { stop(); setBpm(initialBpm); }}
            className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-accent"
            aria-label="Resetar"
          >
            <RotateCcw className="h-6 w-6" />
          </button>
        </div>

        {/* Settings grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Beats por compasso</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBeatsPerBar((v) => Math.max(1, v - 1))}
                className="h-9 w-9 rounded-lg border border-border bg-background text-foreground hover:bg-accent"
              >−</button>
              <span className="w-12 text-center text-lg font-semibold tabular-nums text-foreground">{beatsPerBar}</span>
              <button
                onClick={() => setBeatsPerBar((v) => Math.min(12, v + 1))}
                className="h-9 w-9 rounded-lg border border-border bg-background text-foreground hover:bg-accent"
              >+</button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Subdivisão</label>
            <select
              value={subdivision}
              onChange={(e) => setSubdivision(Number(e.target.value))}
              className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm text-foreground focus:border-primary focus:outline-none"
            >
              {SUBDIVISIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Volume</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border accent-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Total de cliques</label>
            <div className="text-sm text-muted-foreground">{totalClicks} cliques antes de recomeçar</div>
          </div>
        </div>

        {/* Info */}
        <div className="mt-4 rounded-lg bg-background p-3 text-center text-sm text-muted-foreground">
          {isPlaying
            ? `Tocando: ${beatsPerBar}/${subdivision} — ${totalClicks} cliques por compasso`
            : "Pressione play para começar"}
        </div>
      </div>
    </div>
  );
}
