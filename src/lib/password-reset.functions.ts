import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { logAudit, resolveActor } from "@/lib/audit.functions";

const schema = z.object({ password: z.string().min(8) });

// Por que isso passa por `requireSupabaseAuth` em vez de ser uma função
// pública: quando o usuário clica no link do e-mail de recuperação, o
// Supabase cria uma sessão temporária de "recovery" no navegador (o token
// vem embutido na própria URL). Essa sessão já é um JWT válido, então o
// `attachSupabaseAuth` (client middleware) manda ele no header Authorization
// normalmente — o middleware de auth não precisa saber que é uma sessão de
// recuperação, só precisa de um token válido, que ele já tem.
//
// O próprio `context.supabase.auth.updateUser` troca a senha do usuário
// autenticado pelo token recebido — sem precisar do service_role key, então
// não precisamos do supabaseAdmin para a troca em si, só para o log.
export const confirmPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => schema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.auth.updateUser({ password: data.password });
    if (error) throw error;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const actor = await resolveActor(supabaseAdmin, context.userId);
    await logAudit(supabaseAdmin, {
      action: "password_self_reset",
      actorId: context.userId,
      actorName: actor.name,
      actorEmail: actor.email,
      targetName: actor.name,
      targetDetail: actor.email,
    });

    return { ok: true };
  });
