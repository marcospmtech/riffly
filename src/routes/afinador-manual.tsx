import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/afinador-manual")({
  validateSearch: (search: Record<string, unknown>) => ({
    tuning: typeof search["tuning"] === "string" ? search["tuning"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Afinador por corda — Riffly" },
      { name: "description", content: "Afinador por microfone para guitarra e violão com orientação para apertar ou soltar a tarraxa." },
      { property: "og:title", content: "Afinador por corda — Riffly" },
      { property: "og:description", content: "Escolha a afinação e receba orientação automática para cada corda." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AfinadorManualPage,
});

interface TuningPreset {
  name: string;
  instrument: "Guitarra" | "Violão";
  notes: { label: string; freq: number }[];
}

type TuningStatus = "waiting" | "tighten" | "loosen" | "tuned";

export const TUNINGS: TuningPreset[] = [
  {
    name: "Padrão (E A D G B E)",
    instrument: "Guitarra",
    notes: [
      { label: "E6", freq: 82.41 },
      { label: "A5", freq: 110.0 },
      { label: "D4", freq: 146.83 },
      { label: "G3", freq: 196.0 },
      { label: "B2", freq: 246.94 },
      { label: "E1", freq: 329.63 },
    ],
  },
  {
    name: "Drop D (D A D G B E)",
    instrument: "Guitarra",
    notes: [
      { label: "D6", freq: 73.42 },
      { label: "A5", freq: 110.0 },
      { label: "D4", freq: 146.83 },
      { label: "G3", freq: 196.0 },
      { label: "B2", freq: 246.94 },
      { label: "E1", freq: 329.63 },
    ],
  },
  {
    name: "Open G (D G D G B D)",
    instrument: "Guitarra",
    notes: [
      { label: "D6", freq: 73.42 },
      { label: "G5", freq: 98.0 },
      { label: "D4", freq: 146.83 },
      { label: "G3", freq: 196.0 },
      { label: "B2", freq: 246.94 },
      { label: "D1", freq: 293.66 },
    ],
  },
  {
    name: "Padrão violão (E A D G B E)",
    instrument: "Violão",
    notes: [
      { label: "E6", freq: 82.41 },
      { label: "A5", freq: 110.0 },
      { label: "D4", freq: 146.83 },
      { label: "G3", freq: 196.0 },
      { label: "B2", freq: 246.94 },
      { label: "E1", freq: 329.63 },
    ],
  },
  {
    name: "Drop C (C G C F A D)",
    instrument: "Guitarra",
    notes: [
      { label: "C6", freq: 65.41 },
      { label: "G5", freq: 98.0 },
      { label: "C4", freq: 130.81 },
      { label: "F3", freq: 174.61 },
      { label: "A2", freq: 220.0 },
      { label: "D1", freq: 293.66 },
    ],
  },
  {
    name: "Padrão em Ré (D G C F A D)",
    instrument: "Guitarra",
    notes: [
      { label: "D6", freq: 73.42 },
      { label: "G5", freq: 98.0 },
      { label: "C4", freq: 130.81 },
      { label: "F3", freq: 174.61 },
      { label: "A2", freq: 220.0 },
      { label: "D1", freq: 293.66 },
    ],
  },
  {
    name: "DADGAD (D A D G A D)",
    instrument: "Guitarra",
    notes: [
      { label: "D6", freq: 73.42 },
      { label: "A5", freq: 110.0 },
      { label: "D4", freq: 146.83 },
      { label: "G3", freq: 196.0 },
      { label: "A2", freq: 220.0 },
      { label: "D1", freq: 293.66 },
    ],
  },
];

export function tuningNotes(tuning: TuningPreset) {
  return tuning.notes.map((note) => note.label.replace(/\d/g, "")).join(" ");
}

function resolvePresetIndex(value?: string) {
  if (!value) return 0;
  const normalized = value.trim().replace(/\s+/g, " ").toUpperCase();
  const exactIndex = TUNINGS.findIndex((tuning) => tuning.name.toUpperCase() === normalized);
  if (exactIndex >= 0) return exactIndex;
  const notesIndex = TUNINGS.findIndex((tuning) => tuningNotes(tuning).toUpperCase() === normalized);
  return notesIndex >= 0 ? notesIndex : 0;
}

function detectFrequency(buffer: Float32Array, sampleRate: number, target: number) {
  let rms = 0;
  for (const sample of buffer) rms += sample * sample;
  rms = Math.sqrt(rms / buffer.length);
  if (rms < 0.008) return null;

  const minLag = Math.max(2, Math.floor(sampleRate / (target * 1.8)));
  const maxLag = Math.min(buffer.length / 2, Math.ceil(sampleRate / (target * 0.55)));
  let bestLag = -1;
  let bestCorrelation = 0;

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let correlation = 0;
    let energyA = 0;
    let energyB = 0;
    const count = buffer.length - lag;
    for (let i = 0; i < count; i += 1) {
      const a = buffer[i] ?? 0;
      const b = buffer[i + lag] ?? 0;
      correlation += a * b;
      energyA += a * a;
      energyB += b * b;
    }
    const normalized = correlation / Math.sqrt(energyA * energyB);
    if (normalized > bestCorrelation) {
      bestCorrelation = normalized;
      bestLag = lag;
    }
  }

  if (bestLag < 0 || bestCorrelation < 0.82) return null;
  return sampleRate / bestLag;
}

function AfinadorManualPage() {
  const navigate = useNavigate();
  const initialTuning = Route.useSearch().tuning;
  const [presetIndex, setPresetIndex] = useState(() => resolvePresetIndex(initialTuning));
  const [activeString, setActiveString] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [frequency, setFrequency] = useState<number | null>(null);
  const [cents, setCents] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastUpdateRef = useRef(0);
  const silentFramesRef = useRef(0);
  const targetFrequencyRef = useRef(TUNINGS[resolvePresetIndex(initialTuning)]?.notes[0]?.freq ?? 82.41);

  const preset = TUNINGS[presetIndex] ?? TUNINGS[0];
  if (!preset) return null;
  const target = preset.notes[activeString] ?? preset.notes[0];
  if (!target) return null;
  targetFrequencyRef.current = target.freq;

  const stopListening = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    void audioCtxRef.current?.close();
    audioCtxRef.current = null;
    setIsListening(false);
    setFrequency(null);
    setCents(null);
  }, []);

  const listen = useCallback(() => {
    const analyser = analyserRef.current;
    const context = audioCtxRef.current;
    if (!analyser || !context) return;

    if (performance.now() - lastUpdateRef.current >= 90) {
      const buffer = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(buffer);
      const detected = detectFrequency(buffer, context.sampleRate, targetFrequencyRef.current);
      lastUpdateRef.current = performance.now();

      if (detected) {
        silentFramesRef.current = 0;
        const offset = 1200 * Math.log2(detected / targetFrequencyRef.current);
        setFrequency(detected);
        setCents(Math.round(offset));
      } else {
        silentFramesRef.current += 1;
        if (silentFramesRef.current > 4) {
          setFrequency(null);
          setCents(null);
        }
      }
    }
    rafRef.current = requestAnimationFrame(listen);
  }, []);

  const startListening = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Este navegador não oferece acesso ao microfone.");
      return;
    }
    try {
      setError(null);
      setFrequency(null);
      setCents(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const context = new AudioContext();
      if (context.state === "suspended") await context.resume();
      const analyser = context.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0;
      context.createMediaStreamSource(stream).connect(analyser);
      streamRef.current = stream;
      audioCtxRef.current = context;
      analyserRef.current = analyser;
      setIsListening(true);
      listen();
    } catch (caught) {
      console.error(caught);
      setError("Não foi possível usar o microfone. Permita o acesso e tente novamente.");
      stopListening();
    }
  }, [listen, stopListening]);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = Number(e.target.value);
    const nextPreset = TUNINGS[idx];
    if (!nextPreset) return;
    setPresetIndex(idx);
    setActiveString(0);
    setFrequency(null);
    setCents(null);
    navigate({ to: "/afinador-manual", search: { tuning: nextPreset.name }, replace: true });
  };

  const selectString = (index: number) => {
    setActiveString(index);
    setFrequency(null);
    setCents(null);
  };

  const status: TuningStatus = cents === null
    ? "waiting"
    : Math.abs(cents) <= 5
      ? "tuned"
      : cents < 0
        ? "tighten"
        : "loosen";
  const indicatorPosition = cents === null ? 50 : Math.max(4, Math.min(96, 50 + cents * 0.46));
  const statusText = status === "tuned"
    ? "Corda afinada"
    : status === "tighten"
      ? "Aperte a tarraxa"
      : status === "loosen"
        ? "Solte a tarraxa"
        : isListening
          ? "Toque somente a corda selecionada"
          : "Ligue o microfone para começar";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Afinador por corda</h1>
        <p className="mt-1 text-sm text-muted-foreground">Escolha a afinação e o Riffly orienta cada ajuste.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-riffly sm:p-8">
        {/* Tuning selector */}
        <div className="mb-6">
          <label className="mb-1.5 block text-sm font-medium text-foreground">Afinação</label>
          <select
            value={presetIndex}
            onChange={handlePresetChange}
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            {TUNINGS.map((t, i) => (
              <option key={t.name} value={i}>
                {t.instrument} — {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {preset.notes.map((note, i) => {
            const isActive = activeString === i;
            return (
              <Button
                key={i}
                type="button"
                variant="outline"
                onClick={() => selectString(i)}
                aria-pressed={isActive}
                className={`h-20 flex-col gap-0.5 border-2 p-2 ${
                  isActive
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background"
                }`}
              >
                <span className={`text-xl font-bold ${isActive ? "text-primary" : "text-foreground"}`}>
                  {note.label.replace(/\d/g, "")}
                </span>
                <span className="text-xs text-muted-foreground">{6 - i}ª corda</span>
              </Button>
            );
          })}
        </div>

        {error && <div role="alert" className="mb-5 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

        <div className="rounded-lg bg-background p-5 text-center">
          <div className="text-sm font-medium text-muted-foreground">{6 - activeString}ª corda · alvo {target.freq.toFixed(2)} Hz</div>
          <div className="mt-1 text-6xl font-bold text-primary">{target.label.replace(/\d/g, "")}</div>

          <div className="relative mx-auto mt-6 h-12 max-w-lg" aria-label={`${cents ?? 0} cents da afinação`}>
            <div className="absolute left-0 right-0 top-5 h-1 rounded-full bg-border" />
            <div className="absolute left-1/2 top-1 h-9 w-0.5 -translate-x-1/2 bg-riffly-yellow" />
            <div
              className={`absolute top-3 h-5 w-5 -translate-x-1/2 rounded-full border-4 transition-[left] duration-100 ${
                status === "tuned" ? "border-riffly-in-tune bg-riffly-in-tune" : "border-destructive bg-background"
              }`}
              style={{ left: `${indicatorPosition}%` }}
            />
            <span className="absolute left-0 top-8 text-xs text-muted-foreground">grave</span>
            <span className="absolute right-0 top-8 text-xs text-muted-foreground">agudo</span>
          </div>

          <div className={`mt-5 text-xl font-bold ${status === "tuned" ? "text-riffly-in-tune" : status === "waiting" ? "text-muted-foreground" : "text-destructive"}`}>
            {statusText}
          </div>
          <div className="mt-1 min-h-5 text-sm text-muted-foreground">
            {frequency !== null && cents !== null
              ? `${frequency.toFixed(2)} Hz · ${cents > 0 ? "+" : ""}${cents} cents`
              : "Aguarde o som estabilizar antes de girar a tarraxa."}
          </div>

          <div className="mt-5 flex justify-center">
            <Button
              type="button"
              variant={isListening ? "destructive" : "default"}
              size="lg"
              onClick={isListening ? stopListening : startListening}
              className="min-w-52"
            >
              {isListening ? <MicOff /> : <Mic />}
              {isListening ? "Desligar microfone" : "Ligar microfone"}
            </Button>
          </div>
          {isListening && cents === null && (
            <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => { setFrequency(null); setCents(null); }}>
              <RotateCcw /> Tentar novamente
            </Button>
          )}
        </div>

        <div className="mt-4 rounded-lg bg-riffly-purple/10 p-3 text-sm text-muted-foreground">
          Toque uma corda por vez e deixe o som soar. O indicador mostra quando parar de girar a tarraxa.
        </div>
      </div>
    </div>
  );
}
