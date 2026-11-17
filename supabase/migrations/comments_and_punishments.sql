-- Sistema de comentários nas músicas + moderação (banir de comentar).

CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Resposta a outro comentário. Só um nível de profundidade é usado na UI
  -- (resposta de resposta ainda assim funcionaria no banco, mas o front não
  -- renderiza além de 1 nível, de propósito, pra não virar um fórum).
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(trim(content)) > 0 AND char_length(content) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.comments TO authenticated;
GRANT SELECT ON public.comments TO anon;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are publicly readable" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can comment" ON public.comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
-- Sem policy de self-delete de propósito: o pedido só fala em admin/owner
-- apagando comentário de outra pessoa (lixeira), não do autor apagar o
-- próprio. Exclusão por staff passa por comments.functions.ts, usando esta
-- mesma policy de staff (igual ao padrão já usado em songs/song_requests).
CREATE POLICY "Only staff can delete comments" ON public.comments
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE TABLE public.comment_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote SMALLINT NOT NULL CHECK (vote IN (1, -1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comment_votes TO authenticated;
GRANT ALL ON public.comment_votes TO service_role;
ALTER TABLE public.comment_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Votes are publicly readable" ON public.comment_votes FOR SELECT USING (true);
CREATE POLICY "Users can manage own votes" ON public.comment_votes
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Punição = impedimento de comentar. Não é um "banimento da conta" geral —
-- só bloqueia a ação de comentar (ver comments.functions.ts: createComment
-- checa esta tabela antes de inserir).
CREATE TABLE public.punishments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK (char_length(trim(reason)) > 0),
  proof_path TEXT,
  -- NULL = permanente ("infinity"). Só o dono pode criar uma com expires_at
  -- nulo — essa regra é verificada em punishments.functions.ts, não aqui.
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.punishments TO authenticated;
GRANT ALL ON public.punishments TO service_role;
ALTER TABLE public.punishments ENABLE ROW LEVEL SECURITY;
-- Cada usuário só vê a própria punição (pro aviso no site saber que ele está
-- punido); staff vê todas (pra tela de moderação). Criar/editar/apagar
-- punição sempre passa por supabaseAdmin no server function — não há
-- policy de INSERT/UPDATE/DELETE aqui de propósito, só SELECT.
CREATE POLICY "Users see own punishment, staff sees all" ON public.punishments
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
  );

-- Bucket das prints enviadas como prova ao punir alguém. Mesmo padrão de
-- avatars/chord-images: leitura pública via policy, escrita só service_role
-- (upload sempre via server function com supabaseAdmin).
insert into storage.buckets (id, name, public)
values ('comment-proofs', 'comment-proofs', false)
on conflict (id) do nothing;

CREATE POLICY "Allow public read on comment-proofs" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'comment-proofs');
CREATE POLICY "Allow service role full access on comment-proofs" ON storage.objects
  FOR ALL TO service_role USING (bucket_id = 'comment-proofs') WITH CHECK (bucket_id = 'comment-proofs');

-- Novas ações de auditoria usadas pela moderação de comentários.
ALTER TABLE public.audit_logs DROP CONSTRAINT audit_logs_action_check;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_check CHECK (
  action IN (
    'song_created',
    'song_updated',
    'song_deleted',
    'user_deleted',
    'user_password_reset',
    'admin_created',
    'role_changed',
    'password_self_reset',
    'song_request_deleted',
    'comment_deleted',
    'user_punished',
    'punishment_updated',
    'punishment_removed'
  )
);
