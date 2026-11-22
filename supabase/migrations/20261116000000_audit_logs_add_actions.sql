-- Adiciona duas novas ações ao CHECK de audit_logs.action:
--   - password_self_reset: usuário redefiniu a própria senha pelo link de
--     "esqueci minha senha" (fluxo novo em password-reset.functions.ts).
--   - song_request_deleted: staff removeu um pedido de música da fila
--     (deleteSongRequest, em song-requests.functions.ts, não tinha log até
--     agora — era a única exclusão "administrativa" do sistema sem rastro).
--
-- O nome da constraint segue a convenção padrão do Postgres para um CHECK
-- criado inline na definição da coluna em CREATE TABLE: <tabela>_<coluna>_check.
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
    'song_request_deleted'
  )
);
