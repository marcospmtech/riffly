import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getMyPunishment } from "@/lib/comments.functions";

function formatRemaining(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "encerrando...";
  const minutes = Math.ceil(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  if (hours < 24) return `${hours}h${remMin > 0 ? ` ${remMin}min` : ""}`;
  const days = Math.floor(hours / 24);
  return `${days} dia(s)`;
}

// Sem botão de fechar, de propósito — o pedido foi explícito: o aviso fica
// visível o tempo todo enquanto a punição durar. "Não atrapalhar" aqui
// significa ser uma faixa fina no topo, não um modal bloqueando a tela.
export function PunishmentBanner() {
  const { isAuthenticated } = useAuth();

  const { data: punishment } = useQuery({
    queryKey: ["my-punishment"],
    queryFn: () => getMyPunishment(),
    enabled: isAuthenticated,
    // Atualiza sozinho — assim quando o tempo acabar, o aviso some em até um
    // minuto sem a pessoa precisar recarregar a página.
    refetchInterval: 60_000,
  });

  if (!punishment) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-destructive px-4 py-1.5 text-center text-xs font-medium text-destructive-foreground sm:text-sm">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      <span>
        Você está impedido de comentar
        {punishment.expires_at ? ` por mais ${formatRemaining(punishment.expires_at)}` : " permanentemente"}.
      </span>
    </div>
  );
}
