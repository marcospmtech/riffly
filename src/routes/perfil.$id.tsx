// Página de perfil público: dados do usuário, favoritos clicáveis e edição (se for o próprio perfil).
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Music2, Guitar, Disc3, Pencil } from "lucide-react";
import { getPublicProfile } from "@/lib/profile.functions";
import { useAuth } from "@/hooks/use-auth";
import { ProfileAvatar } from "@/components/avatar";
import { EditProfileDialog } from "@/components/edit-profile-dialog";
import { getSongImage } from "@/components/song-card";
import { getCatalogPhotoUrl } from "@/components/catalog-photo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/perfil/$id")({
  // Pública, fora de /_authenticated.
  loader: ({ context, params }) => context.queryClient.ensureQueryData(profileQueryOpts(params.id)),
  head: () => ({
    meta: [{ title: "Perfil — Riffly" }],
  }),
  component: ProfilePage,
});

const profileQueryOpts = (id: string) =>
  queryOptions({
    queryKey: ["profile", id],
    queryFn: () => getPublicProfile({ data: { user_id: id } }),
  });

function ProfilePage() {
  const { id } = Route.useParams();
  const { data: profile } = useSuspenseQuery(profileQueryOpts(id));
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const isOwnProfile = user?.id === id;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/usuarios" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:text-left">
        <ProfileAvatar avatarPath={profile.avatar_path} alt={profile.display_name ?? "Perfil"} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            <h1 className="text-2xl font-bold text-foreground">{profile.display_name ?? "Usuário"}</h1>
            {isOwnProfile && (
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5" /> Editar perfil
              </Button>
            )}
          </div>
          {profile.bio && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{profile.bio}</p>}
        </div>
      </div>

      {(profile.favorite_song || profile.favorite_author || profile.favorite_album) && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Favoritos</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {profile.favorite_song && (
              <FavoriteCard
                icon={Music2}
                kicker="Música favorita"
                title={profile.favorite_song.title}
                subtitle={profile.favorite_song.author}
                image={getSongImage(profile.favorite_song.cover_path)}
                onClick={() => navigate({ to: "/cifras/$id", params: { id: profile.favorite_song!.id } })}
              />
            )}
            {profile.favorite_author && (
              <FavoriteCard
                icon={Guitar}
                kicker="Autor/banda favorita"
                title={profile.favorite_author}
                image={getCatalogPhotoUrl(profile.favorite_author_image)}
                onClick={() => navigate({ to: "/cifras", search: { q: profile.favorite_author! } })}
              />
            )}
            {profile.favorite_album && (
              <FavoriteCard
                icon={Disc3}
                kicker="Álbum favorito"
                title={profile.favorite_album}
                image={getCatalogPhotoUrl(profile.favorite_album_image)}
                onClick={() => navigate({ to: "/cifras", search: { q: profile.favorite_album! } })}
              />
            )}
          </div>
        </div>
      )}

      {editing && (
        <EditProfileDialog
          profile={profile}
          onClose={() => {
            setEditing(false);
            void qc.invalidateQueries({ queryKey: ["profile", id] });
          }}
        />
      )}
    </div>
  );
}

function FavoriteCard({
  icon: Icon,
  kicker,
  title,
  subtitle,
  image,
  onClick,
}: {
  icon: typeof Music2;
  kicker: string;
  title: string;
  subtitle?: string;
  image?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-colors hover:border-riffly-purple"
    >
      <div className="flex h-24 w-full items-center justify-center bg-background">
        {image ? (
          <img src={image} alt={title} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <Icon className="h-8 w-8 text-muted-foreground" />
        )}
      </div>
      <div className="p-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{kicker}</p>
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </button>
  );
}
