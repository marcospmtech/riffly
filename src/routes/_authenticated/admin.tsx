// Painel do administrador (staff): CRUD de músicas, upload de imagens, pedidos de música e fotos de autor/álbum.
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, X, Music2, ArrowUp, ArrowDown, Search, Info, Camera, Check } from "lucide-react";
import { listSongs, createSong, updateSong, deleteSong } from "@/lib/songs.functions";
import { Button } from "@/components/ui/button";
import { uploadChordImage } from "@/lib/upload.functions";
import { listSongRequests, deleteSongRequest } from "@/lib/song-requests.functions";
import { getSongImage, getSongChordPaths } from "@/components/song-card";
import { TUNINGS, tuningNotes } from "@/routes/afinador-manual";
import { useRole } from "@/hooks/use-role";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCatalogPhotoUrl, rowBackground } from "@/components/catalog-photo";
import {
  listAuthorPhotosCatalog,
  listAlbumPhotosCatalog,
  upsertAuthorPhoto,
  upsertAlbumPhoto,
  type AuthorEntry,
  type AlbumEntry,
} from "@/lib/catalog-photos.functions";

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
  image_paths: string[];
  cover_path: string;
}

const emptyForm: SongForm = {
  title: "",
  author: "",
  album: "",
  bpm: 120,
  tuning: "E A D G B E",
  youtube_url: "",
  image_paths: [],
  cover_path: "",
};

function AdminPage() {
  const role = useRole();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<SongForm | null>(null);
  const [search, setSearch] = useState("");

  const { data: songs = [], isLoading } = useQuery({
    queryKey: ["songs"],
    queryFn: () => listSongs(),
  });

  const q = search.trim().toLowerCase();
  const filteredSongs = q
    ? songs.filter(
        (s: any) =>
          s.title.toLowerCase().includes(q) ||
          s.author.toLowerCase().includes(q) ||
          (s.album ?? "").toLowerCase().includes(q),
      )
    : songs;

  const openEdit = (s: any) =>
    setEditing({
      id: s.id,
      title: s.title,
      author: s.author,
      album: s.album ?? "",
      bpm: s.bpm,
      tuning: s.tuning,
      youtube_url: s.youtube_url ?? "",
      image_paths: getSongChordPaths(s),
      cover_path: s.cover_path ?? "",
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
        image_paths: f.image_paths,
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
      <Tabs defaultValue="cifras">
        <TabsList className="mb-6">
          <TabsTrigger value="cifras">Cifras</TabsTrigger>
          <TabsTrigger value="autores">Autores/Álbuns</TabsTrigger>
        </TabsList>

        <TabsContent value="cifras">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Painel do administrador</h1>
              <p className="mt-1 text-sm text-muted-foreground">Gerencie a biblioteca de cifras.</p>
            </div>
            <Button onClick={() => setEditing({ ...emptyForm })}>
              <Plus className="h-4 w-4" /> Nova música
            </Button>
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
                      <Button
                        size="sm"
                        onClick={() =>
                          setEditing({ ...emptyForm, title: r.title, author: r.author, requestId: r.id })
                        }
                      >
                        Adicionar música
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => deleteRequestMutation.mutate(r.id)}
                        className="text-destructive hover:text-destructive"
                        aria-label="Excluir pedido"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
                    <th className="p-3">
                      <div className="relative ml-auto w-full max-w-[220px]">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Buscar por título, autor ou álbum..."
                          aria-label="Buscar música"
                          className="h-9 w-full rounded-lg border border-input bg-background pl-8 pr-3 text-xs font-normal normal-case text-foreground focus:border-primary focus:outline-none"
                        />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSongs.map((s: any) => {
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
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openEdit(s)}
                              aria-label={`Editar ${s.title}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                if (confirm(`Excluir "${s.title}"?`)) deleteMutation.mutate(s.id);
                              }}
                              className="text-destructive hover:text-destructive"
                              aria-label={`Excluir ${s.title}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredSongs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-muted-foreground">
                        {songs.length === 0 ? "Nenhuma música cadastrada." : "Nenhuma música encontrada."}
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
        </TabsContent>

        <TabsContent value="autores">
          <CatalogPhotosTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Ordena: sem foto primeiro (a-z), depois com foto (a-z) — dentro de cada
// grupo a ordem é sempre alfabética.
function sortNoPhotoFirst<T extends { name: string; image_path: string | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aHas = a.image_path ? 1 : 0;
    const bHas = b.image_path ? 1 : 0;
    if (aHas !== bHas) return aHas - bHas;
    return a.name.localeCompare(b.name);
  });
}

function CatalogPhotosTab() {
  const qc = useQueryClient();
  const [authorSearch, setAuthorSearch] = useState("");
  const [albumSearch, setAlbumSearch] = useState("");
  const [editingAuthor, setEditingAuthor] = useState<AuthorEntry | null>(null);
  const [editingAlbum, setEditingAlbum] = useState<AlbumEntry | null>(null);

  const { data: authors = [], isLoading: loadingAuthors } = useQuery({
    queryKey: ["author-photos-catalog"],
    queryFn: () => listAuthorPhotosCatalog(),
  });
  const { data: albums = [], isLoading: loadingAlbums } = useQuery({
    queryKey: ["album-photos-catalog"],
    queryFn: () => listAlbumPhotosCatalog(),
  });

  const aq = authorSearch.trim().toLowerCase();
  const filteredAuthors = sortNoPhotoFirst(
    aq ? authors.filter((a) => a.name.toLowerCase().includes(aq)) : authors,
  );

  const alq = albumSearch.trim().toLowerCase();
  const filteredAlbums = sortNoPhotoFirst(
    alq
      ? albums.filter(
          (a) => a.name.toLowerCase().includes(alq) || (a.author ?? "").toLowerCase().includes(alq),
        )
      : albums,
  );

  const invalidateAll = () => {
    void qc.invalidateQueries({ queryKey: ["author-photos-catalog"] });
    void qc.invalidateQueries({ queryKey: ["album-photos-catalog"] });
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Autores/Álbuns</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fotos exibidas quando alguém escolhe esse autor/banda ou álbum como favorito no perfil.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 text-lg font-semibold text-foreground">Bandas</h2>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={authorSearch}
              onChange={(e) => setAuthorSearch(e.target.value)}
              placeholder="Buscar banda/autor..."
              className="h-9 w-full rounded-lg border border-input bg-background pl-8 pr-3 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          {loadingAuthors ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
              <div className="grid grid-cols-[1fr_auto_auto] gap-2 bg-background px-3 py-2 text-xs font-medium text-muted-foreground">
                <span>Nome</span>
                <span>Possui foto</span>
                <span className="w-8" />
              </div>
              {filteredAuthors.map((a) => (
                <button
                  key={a.name}
                  type="button"
                  onClick={() => setEditingAuthor(a)}
                  className={`grid w-full grid-cols-[1fr_auto_auto] items-center gap-2 px-3 py-2.5 text-left transition-colors ${rowBackground(!!a.image_path)}`}
                >
                  <span className="truncate text-sm font-medium text-foreground">{a.name}</span>
                  <PhotoStatus hasPhoto={!!a.image_path} />
                  <Info className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
              {filteredAuthors.length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma banda/autor encontrado.</p>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 text-lg font-semibold text-foreground">Álbuns</h2>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={albumSearch}
              onChange={(e) => setAlbumSearch(e.target.value)}
              placeholder="Buscar álbum ou banda/autor..."
              className="h-9 w-full rounded-lg border border-input bg-background pl-8 pr-3 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          {loadingAlbums ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
              <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 bg-background px-3 py-2 text-xs font-medium text-muted-foreground">
                <span>Nome</span>
                <span>Autor</span>
                <span>Possui foto</span>
                <span className="w-8" />
              </div>
              {filteredAlbums.map((a) => (
                <button
                  key={a.name}
                  type="button"
                  onClick={() => setEditingAlbum(a)}
                  className={`grid w-full grid-cols-[1fr_1fr_auto_auto] items-center gap-2 px-3 py-2.5 text-left transition-colors ${rowBackground(!!a.image_path)}`}
                >
                  <span className="truncate text-sm font-medium text-foreground">{a.name}</span>
                  <span className="truncate text-sm text-muted-foreground">{a.author ?? "—"}</span>
                  <PhotoStatus hasPhoto={!!a.image_path} />
                  <Info className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
              {filteredAlbums.length === 0 && (
                <p className="p-6 text-center text-sm text-muted-foreground">Nenhum álbum encontrado.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {editingAuthor && (
        <PhotoUploadDialog
          title={`Foto de ${editingAuthor.name}`}
          currentPath={editingAuthor.image_path}
          onUpload={(payload) => upsertAuthorPhoto({ data: { name: editingAuthor.name, ...payload } })}
          onClose={() => setEditingAuthor(null)}
          onDone={() => {
            invalidateAll();
            setEditingAuthor(null);
          }}
        />
      )}
      {editingAlbum && (
        <PhotoUploadDialog
          title={`Foto de ${editingAlbum.name}`}
          currentPath={editingAlbum.image_path}
          onUpload={(payload) => upsertAlbumPhoto({ data: { name: editingAlbum.name, ...payload } })}
          onClose={() => setEditingAlbum(null)}
          onDone={() => {
            invalidateAll();
            setEditingAlbum(null);
          }}
        />
      )}
    </div>
  );
}

function PhotoStatus({ hasPhoto }: { hasPhoto: boolean }) {
  return hasPhoto ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
      <Check className="h-3.5 w-3.5" /> Sim
    </span>
  ) : (
    <span className="text-xs text-muted-foreground">Não</span>
  );
}

function PhotoUploadDialog({
  title,
  currentPath,
  onUpload,
  onClose,
  onDone,
}: {
  title: string;
  currentPath: string | null;
  onUpload: (payload: { content_type: "image/png" | "image/jpeg" | "image/webp"; data_base64: string }) => Promise<any>;
  onClose: () => void;
  onDone: () => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) return;
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
        reader.onerror = () => reject(new Error("Falha ao ler a imagem"));
        reader.readAsDataURL(file);
      });
      return onUpload({ content_type: file.type as any, data_base64: base64 });
    },
    onSuccess: () => {
      toast.success("Foto salva");
      onDone();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar foto"),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(f.type)) {
      toast.error("Use uma imagem PNG, JPEG ou WEBP");
      return;
    }
    if (f.size > 3 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 3MB)");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  const currentUrl = getCatalogPhotoUrl(currentPath);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-xl bg-background">
            {preview ? (
              <img src={preview} alt="Pré-visualização" className="h-full w-full object-cover" />
            ) : currentUrl ? (
              <img src={currentUrl} alt={title} className="h-full w-full object-cover" />
            ) : (
              <Camera className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <label className="w-full cursor-pointer text-center text-sm text-primary hover:underline">
            {currentPath ? "Trocar foto" : "Adicionar foto"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => mutation.mutate()} disabled={!file || mutation.isPending}>
            {mutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>
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

  const uploadOne = async (file: File, folder: "cifras" | "capas") => {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
    const b64 = btoa(binary);
    const { path } = await uploadChordImage({
      data: { filename: file.name, content_type: file.type || "image/png", data_base64: b64, folder },
    });
    return path;
  };

  const handleCover = async (file: File) => {
    setUploading("capas");
    try {
      const path = await uploadOne(file, "capas");
      setForm((f) => ({ ...f, cover_path: path }));
      toast.success("Imagem enviada");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro no upload");
    } finally {
      setUploading(null);
    }
  };

  // Envia as cifras uma a uma, na ordem em que foram selecionadas, e adiciona ao final da lista.
  const handleChords = async (files: File[]) => {
    setUploading("cifras");
    let ok = 0;
    try {
      for (const file of files) {
        const path = await uploadOne(file, "cifras");
        setForm((f) => ({ ...f, image_paths: [...f.image_paths, path] }));
        ok++;
      }
      toast.success(ok === 1 ? "Imagem enviada" : `${ok} imagens enviadas`);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro no upload");
    } finally {
      setUploading(null);
    }
  };

  const removeChord = (index: number) =>
    setForm((f) => ({ ...f, image_paths: f.image_paths.filter((_, i) => i !== index) }));

  const moveChord = (index: number, dir: -1 | 1) =>
    setForm((f) => {
      const target = index + dir;
      if (target < 0 || target >= f.image_paths.length) return f;
      const next = [...f.image_paths];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return { ...f, image_paths: next };
    });

  const coverImg = getSongImage(form.cover_path || null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">{form.id ? "Editar" : "Nova"} música</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
            <X className="h-5 w-5" />
          </Button>
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
                      {t.name}
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
                if (f) void handleCover(f);
              }}
              className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-riffly-purple file:px-3 file:py-1.5 file:text-white"
            />
            {uploading === "capas" && <p className="mt-1 text-xs text-muted-foreground">Enviando...</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Imagens da cifra ({form.image_paths.length})
            </label>
            <p className="mb-2 text-xs text-muted-foreground">
              Podem ser várias. Elas aparecem na página da música uma abaixo da outra, na ordem abaixo.
            </p>
            {form.image_paths.length > 0 && (
              <ul className="mb-2 space-y-2">
                {form.image_paths.map((p, i) => {
                  const src = getSongImage(p);
                  return (
                    <li
                      key={`${p}-${i}`}
                      className="flex items-center gap-3 rounded-lg border border-border bg-background p-2"
                    >
                      <span className="w-5 shrink-0 text-center text-xs font-semibold text-muted-foreground">
                        {i + 1}
                      </span>
                      {src && <img src={src} alt={`Cifra ${i + 1}`} className="h-16 w-24 rounded object-cover object-top" />}
                      <div className="ml-auto flex gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => moveChord(i, -1)}
                          disabled={i === 0}
                          className="h-8 w-8"
                          aria-label="Mover para cima"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => moveChord(i, 1)}
                          disabled={i === form.image_paths.length - 1}
                          className="h-8 w-8"
                          aria-label="Mover para baixo"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeChord(i)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          aria-label="Remover imagem"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={uploading !== null}
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = "";
                if (files.length > 0) void handleChords(files);
              }}
              className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-riffly-purple file:px-3 file:py-1.5 file:text-white"
            />
            {uploading === "cifras" && <p className="mt-1 text-xs text-muted-foreground">Enviando...</p>}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => onSave(form)} disabled={saving || !form.title || !form.author}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
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
