import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, X, Music2 } from "lucide-react";
import { listSongs, createSong, updateSong, deleteSong } from "@/lib/songs.functions";
import { uploadChordImage } from "@/lib/upload.functions";
import { listSongRequests, deleteSongRequest } from "@/lib/song-requests.functions";
import { getSongImage } from "@/components/song-card";
import { TUNINGS, tuningNotes } from "@/routes/afinador-manual";
import { useRole } from "@/hooks/use-role";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel do administrador — Riffly" },
      { name: "description", content: "Gerencie a biblioteca de cifras Riffly." },
    ],
  }),
  component: AdminPage,
});

interface SongForm {
  id?: string;
  requestId?: string;
  title: string;
  author: string;
  album: string;
  bpm: number;
  tuning: string;
  youtube_url: string;
  image_path: string;
  cover_path: string;
}

const emptyForm: SongForm = {
  title: "",
  author: "",
  album: "",
  bpm: 120,
  tuning: "E A D G B E",
  youtube_url: "",
  image_path: "",
  cover_path: "",
};

function AdminPage() {
  const role = useRole();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<SongForm | null>(null);

  const { data: songs = [], isLoading } = useQuery({
    queryKey: ["songs"],
    queryFn: () => listSongs(),
  });

  const { data: requests = [] } = useQuery({
    queryKey: ["song-requests"],
    queryFn: () => listSongRequests(),
  });

  const saveMutation = useMutation({
    mutationFn: async (f: SongForm) => {
      const payload = {
        title: f.title,
        author: f.author,
        album: f.album || null,
        bpm: Number(f.bpm),
        tuning: f.tuning,
        youtube_url: f.youtube_url || null,
        image_path: f.image_path || null,
        cover_path: f.cover_path || null,
      };
      const saved = f.id
        ? await updateSong({ data: { id: f.id, ...payload } })
        : await createSong({ data: payload });
      if (f.requestId) {
        await deleteSongRequest({ data: { id: f.requestId } });
      }
      return saved;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["songs"] });
      void qc.invalidateQueries({ queryKey: ["song-requests"] });
      setEditing(null);
      toast.success("Música salva");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSong({ data: { id } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["songs"] });
      toast.success("Música excluída");
    },
  });

  const deleteRequestMutation = useMutation({
    mutationFn: (id: string) => deleteSongRequest({ data: { id } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["song-requests"] });
      toast.success("Pedido excluído");
    },
  });

  if (role && role !== "admin" && role !== "owner") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-foreground">Acesso negado</h1>
        <p className="mt-2 text-muted-foreground">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Painel do administrador</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gerencie a biblioteca de cifras.</p>
        </div>
        <button
          onClick={() => setEditing({ ...emptyForm })}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Nova música
        </button>
      </div>

      <div className="mb-8 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-lg font-semibold text-foreground">Pedidos de música</h2>
        <p className="mb-3 text-sm text-muted-foreground">Músicas solicitadas pelos usuários.</p>
        {requests.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">Nenhum pedido no momento.</p>
        ) : (
          <div className="space-y-2">
            {requests.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {r.title} <span className="font-normal text-muted-foreground">· {r.author}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.requester_name ?? "Usuário"}
                    {r.requester_email ? ` · ${r.requester_email}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setEditing({ ...emptyForm, title: r.title, author: r.author, requestId: r.id })
                    }
                    className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    Adicionar música
                  </button>
                  <button
                    onClick={() => deleteRequestMutation.mutate(r.id)}
                    className="rounded-lg border border-border p-2 text-destructive hover:border-destructive"
                    aria-label="Excluir pedido"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-background text-left text-muted-foreground">
              <tr>
                <th className="p-3">Música</th>
                <th className="p-3">BPM</th>
                <th className="p-3">Afinação</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {songs.map((s: any) => {
                const cover = getSongImage(s.cover_path);
                return (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-background">
                          {cover ? (
                            <img src={cover} alt={`Capa de ${s.title}`} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Music2 className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{s.title}</div>
                          <div className="text-xs text-muted-foreground">{s.author}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-foreground">{s.bpm}</td>
                    <td className="p-3 text-foreground">{s.tuning}</td>
                    <td className="p-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() =>
                            setEditing({
                              id: s.id,
                              title: s.title,
                              author: s.author,
                              album: s.album ?? "",
                              bpm: s.bpm,
                              tuning: s.tuning,
                              youtube_url: s.youtube_url ?? "",
                              image_path: s.image_path ?? "",
                              cover_path: s.cover_path ?? "",
                            })
                          }
                          className="rounded-lg border border-border p-2 hover:border-primary"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Excluir "${s.title}"?`)) deleteMutation.mutate(s.id);
                          }}
                          className="rounded-lg border border-border p-2 text-destructive hover:border-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {songs.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">
                    Nenhuma música cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <SongFormDialog
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(f) => saveMutation.mutate(f)}
          saving={saveMutation.isPending}
        />
      )}
    </div>
  );
}

function SongFormDialog({
  initial,
  onClose,
  onSave,
  saving,
}: {
  initial: SongForm;
  onClose: () => void;
  onSave: (f: SongForm) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<SongForm>(initial);
  const [uploading, setUploading] = useState<"cifras" | "capas" | null>(null);

  const handleFile = async (file: File, folder: "cifras" | "capas") => {
    setUploading(folder);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
      const b64 = btoa(binary);
      const { path } = await uploadChordImage({
        data: { filename: file.name, content_type: file.type || "image/png", data_base64: b64, folder },
      });
      setForm((f) => (folder === "capas" ? { ...f, cover_path: path } : { ...f, image_path: path }));
      toast.success("Imagem enviada");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro no upload");
    } finally {
      setUploading(null);
    }
  };

  const chordImg = getSongImage(form.image_path || null);
  const coverImg = getSongImage(form.cover_path || null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">{form.id ? "Editar" : "Nova"} música</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-background">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <Field label="Título" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
          <Field label="Autor" value={form.author} onChange={(v) => setForm({ ...form, author: v })} />
          <Field label="Álbum" value={form.album} onChange={(v) => setForm({ ...form, album: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="BPM"
              type="number"
              value={String(form.bpm)}
              onChange={(v) => setForm({ ...form, bpm: Number(v) || 0 })}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Afinação</label>
              <select
                value={form.tuning}
                onChange={(e) => setForm({ ...form, tuning: e.target.value })}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
              >
                {TUNINGS.map((t) => {
                  const notes = tuningNotes(t);
                  return (
                    <option key={t.name} value={notes}>
                      {t.name} — {t.instrument}
                    </option>
                  );
                })}
                {form.tuning && !TUNINGS.some((t) => tuningNotes(t) === form.tuning) && (
                  <option value={form.tuning}>{form.tuning} (personalizada)</option>
                )}
              </select>
            </div>
          </div>
          <Field label="URL do YouTube" value={form.youtube_url} onChange={(v) => setForm({ ...form, youtube_url: v })} />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Capa do álbum (PNG/JPG) — aparece no card da música
            </label>
            {coverImg && <img src={coverImg} alt="Capa" className="mb-2 h-20 w-20 rounded-lg object-cover" />}
            <input
              type="file"
              accept="image/*"
              disabled={uploading !== null}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f, "capas");
              }}
              className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-riffly-purple file:px-3 file:py-1.5 file:text-white"
            />
            {uploading === "capas" && <p className="mt-1 text-xs text-muted-foreground">Enviando...</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Imagem da cifra</label>
            {chordImg && <img src={chordImg} alt="Cifra" className="mb-2 max-h-40 rounded-lg" />}
            <input
              type="file"
              accept="image/*"
              disabled={uploading !== null}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f, "cifras");
              }}
              className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-riffly-purple file:px-3 file:py-1.5 file:text-white"
            />
            {uploading === "cifras" && <p className="mt-1 text-xs text-muted-foreground">Enviando...</p>}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-background">
            Cancelar
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving || !form.title || !form.author}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
      />
    </div>
  );
}
