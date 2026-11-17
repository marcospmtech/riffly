import { Link } from "@tanstack/react-router";
import { Github, Instagram, Mail } from "lucide-react";
import logoUrl from "@/assets/riffly-logo.png";

// Separado em arrays pra não duplicar o JSX de cada link — se um dia mudar
// o estilo do item, muda em um lugar só.
const TOOL_LINKS = [
  { to: "/metronomo", label: "Metrônomo" },
  { to: "/afinador", label: "Afinador" },
  { to: "/afinador-manual", label: "Afinador manual" },
  { to: "/reconhecer", label: "Reconhecer música" },
  { to: "/cifras", label: "Cifras" },
] as const;

const ACCOUNT_LINKS = [
  { to: "/auth", label: "Entrar / Criar conta" },
  { to: "/usuarios", label: "Usuários" },
  { to: "/favoritos", label: "Favoritos" },
  { to: "/recentes", label: "Recentes" },
] as const;

const LEGAL_LINKS = [
  { to: "/termos", label: "Termos de uso" },
  { to: "/privacidade", label: "Política de privacidade" },
] as const;

export function Footer() {
  // Ano calculado em runtime: assim o "© 2026" não fica desatualizado em
  // janeiro de 2027 só porque ninguém lembrou de trocar um número fixo.
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-riffly-purple text-white/80">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-10 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="col-span-2 flex flex-col gap-3 md:col-span-1">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoUrl} alt="Riffly" className="h-9 w-9" />
            <span className="text-lg font-bold text-white">Riffly</span>
          </Link>
          <p className="text-sm text-white/60">
            Ferramentas e recursos para músicos em um só lugar.
          </p>
          <div className="flex items-center gap-3 pt-1">
            <a
              href="https://github.com/marcospmtech/riffly"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Repositório do Riffly no GitHub"
              className="text-white/60 transition-colors hover:text-white"
            >
              <Github className="h-5 w-5" />
            </a>
            <a
              href="https://www.instagram.com/marcosmonea.bjj/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="text-white/60 transition-colors hover:text-white"
            >
              <Instagram className="h-5 w-5" />
            </a>
            <a
              href="mailto:contato@riffly.app.br"
              aria-label="Enviar e-mail"
              className="text-white/60 transition-colors hover:text-white"
            >
              <Mail className="h-5 w-5" />
            </a>
          </div>
        </div>

        <nav aria-label="Ferramentas">
          <h3 className="text-sm font-semibold text-white">Ferramentas</h3>
          <ul className="mt-3 space-y-2">
            {TOOL_LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="text-sm text-white/60 transition-colors hover:text-white hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Conta">
          <h3 className="text-sm font-semibold text-white">Conta</h3>
          <ul className="mt-3 space-y-2">
            {ACCOUNT_LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="text-sm text-white/60 transition-colors hover:text-white hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Legal">
          <h3 className="text-sm font-semibold text-white">Legal</h3>
          <ul className="mt-3 space-y-2">
            {LEGAL_LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="text-sm text-white/60 transition-colors hover:text-white hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-white/10 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 text-xs text-white/50 sm:flex-row">
          <p>© {year} Riffly. Todos os direitos reservados.</p>
          <p>Desenvolvido por Marcos P. Monea</p>
        </div>
      </div>
    </footer>
  );
}
