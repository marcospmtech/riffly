// Modal de edição de perfil: nome, bio, avatar e os 3 favoritos (música/autor/álbum).
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProfileAvatar } from "@/components/avatar";
import { PickerDialog, type PickerItem } from "@/components/picker-dialog";
import { listSongs, listCatalogFacets } from "@/lib/songs.functions";
import { updateMyProfile, uploadAvatar, removeAvatar, type PublicProfile } from "@/lib/profile.functions";

type Picker = "song" | "author" | "album" | null;

// Espelha o enum validado no server (uploadAvatar).
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function EditProfileDialog({
  profile,
  onClose,
}: {
  profile: PublicProfile;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [favoriteSong, setFavoriteSong] = useState(
    profile.favorite_song ? { id: profile.favorite_song.id, label: profile.favorite_song.title } : null,
  );
  const [favoriteAuthor, setFavoriteAuthor] = useState(profile.favorite_author);
  const [favoriteAlbum, setFavoriteAlbum] = useState(profile.favorite_album);
  const [openPicker, setOpenPicker] = useState<Picker>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const { data: songs = [] } = useQuery({ queryKey: ["songs"], queryFn: () => listSongs() });
  const { data: facets } = useQuery({ queryKey: ["catalog-facets"], queryFn: () => listCatalogFacets() });

  const songItems: PickerItem[] = (songs as any[]).map((s) => ({
    value: s.id,
    label: s.title,
    sublabel: s.author,
  }));
  const authorItems: PickerItem[] = (facets?.authors ?? []).map((a) => ({ value: a, label: a }));
  const albumItems: PickerItem[] = (facets?.albums ?? []).map((a) => ({ value: a, label: a }));

  const avatarMutation = useMutation({
    mutationFn: (payload: { content_type: string; data_base64: string }) =>
      uploadAvatar({ data: payload as any }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["profile", profile.user_id] });
      toast.success("Foto atualizada");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao enviar foto"),
    onSettled: () => setAvatarPreview(null),
  });

  const removeAvatarMutation = useMutation({
    mutationFn: () => removeAvatar(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["profile", profile.user_id] });
      toast.success("Foto removida");
    },
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      updateMyProfile({
        data: {
          display_name: displayName.trim(),
          bio: bio.trim() || null,
          favorite_song_id: favoriteSong?.id ?? null,
          favorite_author: favoriteAuthor,
          favorite_album: favoriteAlbum,
        },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["profile", profile.user_id] });
      toast.success("Perfil atualizado");
      onClose();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar perfil"),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite escolher o mesmo arquivo de novo depois
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Use uma imagem PNG, JPEG ou WEBP");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 3MB)");
      return;
    }

    setAvatarPreview(URL.createObjectURL(file));

    const reader = new FileReader();
    reader.onload = () => {
      // Pega só a parte base64 depois da vírgula.
      const base64 = String(reader.result).split(",")[1] ?? "";
      avatarMutation.mutate({ content_type: file.type, data_base64: base64 });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-y-auto rounded-2xl border border-border bg-card p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Editar perfil</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Pré-visualização"
                className="h-24 w-24 rounded-full object-cover opacity-70"
              />
            ) : (
              <ProfileAvatar avatarPath={profile.avatar_path} alt={displayName || "Avatar"} size="lg" />
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarMutation.isPending}
              aria-label="Trocar foto"
              className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
          {profile.avatar_path && (
            <button
              type="button"
              onClick={() => removeAvatarMutation.mutate()}
              disabled={removeAvatarMutation.isPending}
              className="text-xs text-muted-foreground transition-colors hover:text-destructive"
            >
              Remover foto
            </button>
          )}
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Nome</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={60}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-sm font-medium text-foreground">Descrição</label>
              <span className="text-xs text-muted-foreground">{bio.length}/280</span>
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 280))}
              rows={3}
              placeholder="Fale um pouco sobre você..."
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <FavoriteRow
            label="Música favorita"
            value={favoriteSong?.label ?? null}
            onPick={() => setOpenPicker("song")}
            onClear={() => setFavoriteSong(null)}
          />
          <FavoriteRow
            label="Autor/banda favorita"
            value={favoriteAuthor}
            onPick={() => setOpenPicker("author")}
            onClear={() => setFavoriteAuthor(null)}
          />
          <FavoriteRow
            label="Álbum favorito"
            value={favoriteAlbum}
            onPick={() => setOpenPicker("album")}
            onClear={() => setFavoriteAlbum(null)}
          />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !displayName.trim()}
          >
            {saveMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      {openPicker === "song" && (
        <PickerDialog
          title="Música favorita"
          placeholder="Buscar música..."
          items={songItems}
          onSelect={(value) => {
            const song = (songs as any[]).find((s) => s.id === value);
            setFavoriteSong(song ? { id: song.id, label: song.title } : null);
            setOpenPicker(null);
          }}
          onClose={() => setOpenPicker(null)}
        />
      )}
      {openPicker === "author" && (
        <PickerDialog
          title="Autor/banda favorita"
          placeholder="Buscar autor ou banda..."
          items={authorItems}
          onSelect={(value) => {
            setFavoriteAuthor(value);
            setOpenPicker(null);
          }}
          onClose={() => setOpenPicker(null)}
        />
      )}
      {openPicker === "album" && (
        <PickerDialog
          title="Álbum favorito"
          placeholder="Buscar álbum..."
          items={albumItems}
          onSelect={(value) => {
            setFavoriteAlbum(value);
            setOpenPicker(null);
          }}
          onClose={() => setOpenPicker(null)}
        />
      )}
    </div>
  );
}

function FavoriteRow({
  label,
  value,
  onPick,
  onClear,
}: {
  label: string;
  value: string | null;
  onPick: () => void;
  onClear: () => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPick}
          className="h-10 flex-1 cursor-pointer rounded-lg border border-input bg-background px-3 text-left text-sm text-foreground transition-colors hover:border-primary focus:border-primary focus:outline-none"
        >
          {value ?? <span className="text-muted-foreground">Selecionar...</span>}
        </button>
        {value && (
          <Button type="button" variant="outline" size="icon" onClick={onClear} aria-label={`Remover ${label}`}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
