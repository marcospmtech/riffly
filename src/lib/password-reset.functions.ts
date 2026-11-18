// Server function de confirmação de reset de senha (fluxo "esqueci minha senha").
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { logAudit, resolveActor } from "@/lib/audit.functions";

const schema = z.object({ password: z.string().min(8) });

// Passa por requireSupabaseAuth: o link de recuperação já cria uma sessão válida (JWT) no navegador.
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
