import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";

export const Route = createFileRoute("/afinador")({
  head: () => ({
    meta: [
      { title: "Afinador cromático — Riffly" },
      { name: "description", content: "Afinador cromático com microfone. Veja a nota detectada em tempo real." },
      { property: "og:title", content: "Afinador cromático — Riffly" },
      { property: "og:description", content: "Afinador cromático em tempo real." },
    ],
  }),
  component: AfinadorPage,
});

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function frequencyToNote(freq: number): { note: string; octave: number; cents: number; index: number } {
  const A4 = 440;
  const semitones = 12 * Math.log2(freq / A4);
  const exactIndex = Math.round(semitones) + 57;
  const octave = Math.floor(exactIndex / 12);
  const noteIndex = ((exactIndex % 12) + 12) % 12;
  const exactSemitones = 12 * Math.log2(freq / A4);
  const cents = Math.round((exactSemitones - Math.round(exactSemitones)) * 100);
  return { note: NOTES[noteIndex]!, octave, cents, index: noteIndex };
}

function AfinadorPage() {
  const [isActive, setIsActive] = useState(false);
  const [frequency, setFrequency] = useState(0);
  const [noteInfo, setNoteInfo] = useState<{ note: string; octave: number; cents: number; index: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const detectPitch = useCallback(() => {
    const analyser = analyserRef.current;
    const ctx = audioCtxRef.current;
    if (!analyser || !ctx) return;

    const bufferLength = analyser.fftSize;
    const buffer = new Float32Array(bufferLength);
    analyser.getFloatTimeDomainData(buffer);

    // Autocorrelation
    const sampleRate = ctx.sampleRate;
    let bestOffset = -1;
    let bestCorrelation = 0;
    let rms = 0;

    for (let i = 0; i < bufferLength; i++) {
      rms += buffer[i]! * buffer[i]!;
    }
    rms = Math.sqrt(rms / bufferLength);

    if (rms < 0.01) {
      rafRef.current = requestAnimationFrame(detectPitch);
      return;
    }

    const minLag = Math.floor(sampleRate / 1000); // up to 1000 Hz
    const maxLag = Math.floor(sampleRate / 60); // down to 60 Hz

    const correlations = new Array(maxLag);
    for (let lag = minLag; lag <= maxLag; lag++) {
      let correlation = 0;
      for (let i = 0; i < bufferLength - lag; i++) {
        correlation += buffer[i]! * buffer[i + lag]!;
      }
      correlations[lag] = correlation;
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestOffset = lag;
      }
    }

    if (bestCorrelation > 0.9 && bestOffset > 0) {
      const freq = sampleRate / bestOffset;
      if (freq > 60 && freq < 1000) {
        setFrequency(freq);
        setNoteInfo(frequencyToNote(freq));
      }
    }

    rafRef.current = requestAnimationFrame(detectPitch);
  }, []);

  const start = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;
      setIsActive(true);
      detectPitch();
    } catch (err) {
      setError("Não foi possível acessar o microfone. Verifique as permissões.");
      console.error(err);
    }
  }, [detectPitch]);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
    setIsActive(false);
    setFrequency(0);
    setNoteInfo(null);
  }, []);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  // Needle angle: -50 (flat) to +50 (sharp) cents, 0 = in tune
  const needleAngle = noteInfo ? Math.max(-50, Math.min(50, noteInfo.cents)) : 0;
  const isInTune = noteInfo && Math.abs(noteInfo.cents) < 5;
  const isFlat = noteInfo && noteInfo.cents < -5;
  const isSharp = noteInfo && noteInfo.cents > 5;

  const needleColor = isInTune
    ? "var(--color-riffly-in-tune)"
    : isFlat || isSharp
      ? "var(--color-riffly-out-of-tune)"
      : "var(--color-foreground)";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Afinador cromático</h1>
        <p className="mt-1 text-sm text-muted-foreground">Afinar com detecção de nota em tempo real.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-riffly sm:p-8">
        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        {/* Note display */}
        <div className="mb-6 text-center">
          <div
            className="text-8xl font-bold tabular-nums transition-colors"
            style={{ color: noteInfo ? needleColor : "var(--color-muted-foreground)" }}
          >
            {noteInfo ? noteInfo.note : "—"}
          </div>
          {noteInfo && (
            <div className="text-lg text-muted-foreground">
              {noteInfo.octave} · {noteInfo.cents > 0 ? "+" : ""}{noteInfo.cents} cents
            </div>
          )}
        </div>

        {/* Needle indicator */}
        <div className="relative mb-6 h-32 overflow-hidden">
          {/* Fixed vertical line */}
          <div className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-riffly-yellow" />
          {/* Scale marks */}
          <div className="absolute left-1/2 top-0 flex h-full -translate-x-1/2">
            {[-50, -25, 0, 25, 50].map((mark) => (
              <div
                key={mark}
                className="absolute top-0 h-3 w-px bg-border"
                style={{ left: `${50 + mark}%`, transform: "translateX(-50%)" }}
              />
            ))}
          </div>
          {/* Needle */}
          <div
            className="absolute left-1/2 top-0 origin-bottom transition-transform duration-100"
            style={{
              transform: `rotate(${needleAngle * 1.5}deg)`,
              transformOrigin: "bottom center",
            }}
          >
            <div
              className="h-28 w-1 rounded-full"
              style={{ backgroundColor: noteInfo ? needleColor : "var(--color-border)" }}
            />
          </div>
          {/* Base */}
          <div className="absolute bottom-0 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-riffly-purple" />
          {/* Labels */}
          <div className="absolute bottom-0 left-2 text-xs text-muted-foreground">♭</div>
          <div className="absolute bottom-0 right-2 text-xs text-muted-foreground">♯</div>
        </div>

        {/* Status */}
        <div className="mb-4 text-center text-sm font-medium" style={{ color: needleColor }}>
          {isActive && noteInfo
            ? isInTune
              ? "Afinação perfeita! ✓"
              : isFlat
                ? "Afine para cima ↑"
                : "Afine para baixo ↓"
            : isActive
              ? "Toque uma nota..."
              : "Microfone desligado"}
        </div>

        {/* Toggle button */}
        <div className="flex justify-center">
          <button
            onClick={isActive ? stop : start}
            className={`flex h-16 w-16 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 ${
              isActive ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"
            }`}
            aria-label={isActive ? "Parar microfone" : "Iniciar microfone"}
          >
            {isActive ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
          </button>
        </div>

        {frequency > 0 && (
          <div className="mt-4 text-center text-xs text-muted-foreground">
            {frequency.toFixed(1)} Hz
          </div>
        )}
      </div>

      {/* Note list */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-riffly">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Todas as notas</h2>
        <div className="flex flex-wrap gap-2">
          {NOTES.map((note) => {
            const isActiveNote = noteInfo?.note === note;
            return (
              <div
                key={note}
                className={`flex h-14 w-14 items-center justify-center rounded-lg text-lg font-bold transition-colors ${
                  isActiveNote
                    ? isInTune
                      ? "bg-riffly-in-tune text-background"
                      : "bg-destructive text-destructive-foreground"
                    : "bg-background text-muted-foreground"
                }`}
              >
                {note}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
