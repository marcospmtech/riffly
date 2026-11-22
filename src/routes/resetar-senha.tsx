// Página de destino do link de "esqueci minha senha": define a nova senha.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { confirmPasswordReset } from "@/lib/password-reset.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/resetar-senha")({
  head: () => ({
    meta: [{ title: "Redefinir senha — Riffly" }],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  // checking: ainda não sabemos se há sessão de recuperação válida. ready: há sessão, mostra o formulário.
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fluxo atual do Supabase: o link do e-mail traz ?token_hash=...&type=recovery
    // na URL (em vez de uma sessão já pronta no fragmento #). Precisamos
    // trocar esse token pela sessão de recuperação manualmente.
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get("token_hash");
    const type = params.get("type");
    const errorDescription = params.get("error_description");

    if (errorDescription) {
      setError(decodeURIComponent(errorDescription.replace(/\+/g, " ")));
      setChecking(false);
      return;
    }

    if (tokenHash && type === "recovery") {
      supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash }).then(({ error: verifyError }) => {
        if (verifyError) {
          setError(verifyError.message);
        } else {
          setReady(true);
          // Limpa o token da URL depois de usado — ele não serve mais e não
          // deveria ficar visível/reutilizável na barra de endereço.
          window.history.replaceState({}, "", "/resetar-senha");
        }
        setChecking(false);
      });
      return;
    }

    // Fallback: fluxo antigo, sessão já vem pronta via hash (PASSWORD_RECOVERY).
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setReady(true);
        setChecking(false);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      setChecking(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("As senhas não coincidem");
      return;
    }
    setLoading(true);
    try {
      await confirmPasswordReset({ data: { password } });
      toast.success("Senha atualizada! Você já está logado(a).");
      navigate({ to: "/", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar a senha");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Verificando link...</p>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 text-center">
        <p className="text-sm text-muted-foreground">
          {error ?? "Link inválido ou expirado. Solicite um novo link de recuperação na tela de login."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-riffly sm:p-8">
        <h1 className="mb-6 text-2xl font-bold text-foreground">Definir nova senha</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Nova senha</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Confirmar senha</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" disabled={loading} className="h-11 w-full">
            {loading ? "Salvando..." : "Salvar nova senha"}
          </Button>
        </form>
      </div>
    </div>
  );
}
