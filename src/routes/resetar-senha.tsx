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
  // `checking`: ainda não sabemos se existe uma sessão de recuperação válida.
  // `ready`: existe sessão, pode mostrar o formulário.
  // Sem esse estado intermediário, a pessoa veria "link inválido" por um
  // instante mesmo quando o link é válido, só porque o evento do Supabase
  // ainda não chegou.
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // O link do e-mail de recuperação faz o Supabase ler o token direto da
    // URL e criar uma sessão temporária automaticamente — isso dispara o
    // evento PASSWORD_RECOVERY. Também checamos getSession() pro caso de a
    // sessão já ter sido processada antes deste efeito rodar.
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
      toast.success("Senha atualizada! Faça login novamente.");
      // Desloga de propósito: a sessão de recuperação não deveria virar uma
      // sessão "normal" logada sem a pessoa ter passado pelo login de novo.
      await supabase.auth.signOut();
      navigate({ to: "/auth", replace: true });
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
          Link inválido ou expirado. Solicite um novo link de recuperação na tela de login.
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
