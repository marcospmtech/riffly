import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { Menu, Search, X } from "lucide-react";

import appCss from "../styles.css?url";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";
import { supabase } from "@/integrations/supabase/client";
import logoUrl from "@/assets/riffly-logo.png";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar para o início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Esta página não carregou
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo deu errado do nosso lado. Você pode tentar recarregar ou voltar para o início.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Voltar para o início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Riffly — Afinador, Metrônomo e Cifras" },
      { name: "description", content: "Riffly é o site unificado de afinador, metrônomo e biblioteca de cifras para músicos." },
      { name: "author", content: "Riffly" },
      { property: "og:title", content: "Riffly — Afinador, Metrônomo e Cifras" },
      { property: "og:description", content: "Riffly é o site unificado de afinador, metrônomo e biblioteca de cifras para músicos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@riffly" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="flex min-h-screen flex-col bg-background">
          <Header />
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
        <Toaster richColors position="top-center" />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function Header() {
  const { user, isLoading } = useAuth();
  const role = useRole();
  const isAdminOrOwner = role === "admin" || role === "owner";
  const isOwner = role === "owner";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const navLinks = [
    { to: "/", label: "Início" },
    { to: "/metronomo", label: "Metrônomo" },
    { to: "/afinador", label: "Afinador" },
    { to: "/afinador-manual", label: "Afinador manual" },
    { to: "/reconhecer", label: "Reconhecer" },
    { to: "/cifras", label: "Cifras" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-riffly-purple shadow-riffly">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <img src={logoUrl} alt="Riffly" className="h-10 w-10" />
          <span className="hidden text-xl font-bold text-white sm:inline">Riffly</span>
        </Link>

        <div className="hidden flex-1 md:block">
          <GlobalSearch />
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white"
              activeProps={{ className: "bg-white/15 text-white" }}
            >
              {link.label}
            </Link>
          ))}
          {!isLoading && user && isAdminOrOwner && (
            <Link
              to="/admin"
              className="rounded-md px-3 py-2 text-sm font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white"
              activeProps={{ className: "bg-white/15 text-white" }}
            >
              Admin
            </Link>
          )}
          {!isLoading && user && isOwner && (
            <Link
              to="/dono"
              className="rounded-md px-3 py-2 text-sm font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white"
              activeProps={{ className: "bg-white/15 text-white" }}
            >
              Dono
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <button
            type="button"
            className="rounded-md p-2 text-white/90 hover:bg-white/10 md:hidden"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Buscar"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="rounded-md p-2 text-white/90 hover:bg-white/10 md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <div className="hidden md:block">
            <AuthButton />
          </div>
        </div>
      </div>

      {searchOpen && (
        <div className="border-t border-white/10 px-4 py-3 md:hidden">
          <GlobalSearch />
        </div>
      )}

      {mobileOpen && (
        <div className="border-t border-white/10 px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-md px-3 py-2 text-base font-medium text-white/90 hover:bg-white/10"
                activeProps={{ className: "bg-white/15 text-white" }}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {!isLoading && user && isAdminOrOwner && (
              <Link
                to="/admin"
                className="rounded-md px-3 py-2 text-base font-medium text-white/90 hover:bg-white/10"
                activeProps={{ className: "bg-white/15 text-white" }}
                onClick={() => setMobileOpen(false)}
              >
                Admin
              </Link>
            )}
            {!isLoading && user && isOwner && (
              <Link
                to="/dono"
                className="rounded-md px-3 py-2 text-base font-medium text-white/90 hover:bg-white/10"
                activeProps={{ className: "bg-white/15 text-white" }}
                onClick={() => setMobileOpen(false)}
              >
                Dono
              </Link>
            )}
            <div className="mt-2 border-t border-white/10 pt-2">
              <AuthButton onClick={() => setMobileOpen(false)} />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.navigate({
      to: "/cifras",
      search: { q: query.trim() },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-xl">
      <input
        type="search"
        placeholder="Pesquise por uma música..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-10 w-full rounded-full border-0 bg-white pl-4 pr-10 text-sm text-primary-foreground placeholder:text-primary-foreground/60 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-riffly-yellow"
      />
      <button
        type="submit"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-riffly-purple hover:bg-riffly-purple/10"
        aria-label="Buscar"
      >
        <Search className="h-4 w-4" />
      </button>
    </form>
  );
}

function AuthButton({ onClick }: { onClick?: () => void }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return <div className="h-9 w-20 animate-pulse rounded-md bg-white/20" />;
  }

  if (user) {
    return (
      <button
        onClick={async () => {
          onClick?.();
          await supabase.auth.signOut();
          router.navigate({ to: "/", replace: true });
        }}
        className="rounded-md bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
      >
        Sair
      </button>
    );
  }

  return (
    <Link
      to="/auth"
      className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      onClick={onClick}
    >
      Entrar
    </Link>
  );
}
