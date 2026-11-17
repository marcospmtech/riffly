import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { listPublicProfiles } from "@/lib/profile.functions";
import { ProfileAvatar } from "@/components/avatar";

export const Route = createFileRoute("/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários — Riffly" },
      { name: "description", content: "Encontre e visite perfis de outros usuários do Riffly." },
    ],
  }),
  component: UsuariosPage,
});

function UsuariosPage() {
  const [search, setSearch] = useState("");

  // Busca no servidor (não filtro client-side): diferente do catálogo de
  // músicas, a lista de perfis pode crescer bem mais, e não tem sentido
  // trazer todo mundo pra filtrar no navegador só pra achar uma pessoa.
  const { data: profiles = [], isFetching } = useQuery({
    queryKey: ["public-profiles", search],
    queryFn: () => listPublicProfiles({ data: { search: search.trim() || undefined } }),
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-foreground">Usuários</h1>
      <p className="mt-1 text-sm text-muted-foreground">Visite o perfil de outros músicos do Riffly.</p>

      <div className="relative mt-6 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome..."
          className="h-10 w-full rounded-full border border-input bg-background pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
        />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {profiles.map((p) => (
          <Link
            key={p.user_id}
            to="/perfil/$id"
            params={{ id: p.user_id }}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-riffly-purple"
          >
            <ProfileAvatar avatarPath={p.avatar_path} alt={p.display_name ?? "Usuário"} size="md" />
            <span className="truncate text-sm font-semibold text-foreground">
              {p.display_name ?? "Usuário"}
            </span>
          </Link>
        ))}
      </div>

      {!isFetching && profiles.length === 0 && (
        <p className="mt-10 text-center text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
      )}
    </div>
  );
}
