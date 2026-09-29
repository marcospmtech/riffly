import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ensureOwnerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const ensureOwner = createServerFn({ method: "POST" })
  .inputValidator((input) => ensureOwnerSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "owner")
      .limit(1);
    if (existing && existing.length > 0) {
      return { ok: false, message: "Owner already exists" };
    }

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { display_name: "Owner" },
    });
    if (createError) throw createError;

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUser.user.id, role: "owner" });
    if (roleError) throw roleError;

    return { ok: true, id: newUser.user.id };
  });
