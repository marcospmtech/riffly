-- Tabela de auditoria (logs administrativos).
--
-- Por que os dados do ator e do alvo ficam "congelados" aqui (actor_name,
-- actor_email, target_name, target_detail) em vez de só guardar o user_id e
-- fazer JOIN com profiles/auth.users na hora de exibir:
-- se um usuário for deletado depois (ex.: deleteUser), um JOIN perderia o
-- nome/e-mail dele no histórico. Um log de auditoria precisa continuar
-- legível mesmo depois que a pessoa não existe mais no sistema.
--
-- "action" é TEXT + CHECK (não ENUM) de propósito: adicionar um tipo novo de
-- ação no futuro vira só uma linha a mais nessa lista, sem precisar de uma
-- migration separada para alterar um tipo ENUM.
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL CHECK (
    action IN (
      'song_created',
      'song_updated',
      'song_deleted',
      'user_deleted',
      'user_password_reset',
      'admin_created',
      'role_changed'
    )
  ),
  -- Quem executou a ação.
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name TEXT,
  actor_email TEXT,
  -- Em quem/o que a ação foi executada (nome da música ou do usuário).
  target_name TEXT,
  -- Linha de baixo no card: autor da música OU e-mail do usuário alvo.
  target_detail TEXT,
  -- Dados extras por tipo de ação (ex.: { "old_role": "user", "new_role": "admin" }).
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Só a leitura é exposta para o client logado; a escrita acontece sempre
-- via supabaseAdmin (service_role) dentro dos server functions, nunca
-- diretamente do browser — por isso não há policy de INSERT para "authenticated".
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only owner can view audit logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'owner'));

-- A tela de logs sempre filtra por período (ano) e ordena do mais recente
-- para o mais antigo — esse índice cobre as duas coisas de uma vez.
CREATE INDEX audit_logs_created_at_idx ON public.audit_logs (created_at DESC);
