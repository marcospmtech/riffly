import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface AdminUser {
  id: string;
  email: string;
  display_name: string | null;
  role: "owner" | "admin" | "user";
  created_at: string;
}

export type AccountRole = AdminUser["role"];

const rolePriority: Record<AccountRole, number> = {
  owner: 0,
  admin: 1,
  user: 2,
};

async function requireOwner(context: {
  supabase: SupabaseClient<Database>;
  userId: string;
}) {
  const { data: roles, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .in("role", ["owner"]);
  if (error) throw error;
  if (!roles || roles.length === 0) throw new Response("Forbidden", { status: 403 });
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await requireOwner(context);

    const { data: profiles, error: profError } = await supabaseAdmin
      .from("profiles")
      .select("id, user_id, display_name, created_at");
    if (profError) throw profError;

    const { data: userRoles, error: urError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role");
    if (urError) throw urError;

    const roleMap = new Map<string, string>();
    for (const ur of userRoles ?? []) {
      const existing = roleMap.get(ur.user_id);
      if (existing === "owner" || (existing === "admin" && ur.role === "user")) continue;
      roleMap.set(ur.user_id, ur.role);
    }

    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) throw authError;

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]));
    const result: AdminUser[] = (authUsers.users ?? []).map((u) => {
      const prof = profileMap.get(u.id);
      return {
        id: u.id,
        email: u.email ?? "",
        display_name: prof?.display_name ?? null,
        role: (roleMap.get(u.id) as AdminUser["role"]) ?? "user",
        created_at: prof?.created_at ?? u.created_at,
      };
    });
    result.sort((a, b) => {
      const roleDifference = rolePriority[a.role] - rolePriority[b.role];
      if (roleDifference !== 0) return roleDifference;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
    return result;
  });

const createAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  display_name: z.string().min(1),
});

export const createAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => createAdminSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await requireOwner(context);

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { display_name: data.display_name },
    });
    if (createError) throw createError;

    const { error: roleInsertError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUser.user.id, role: "admin" });
    if (roleInsertError) throw roleInsertError;

    const { error: roleCleanupError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", newUser.user.id)
      .neq("role", "admin");
    if (roleCleanupError) throw roleCleanupError;

    return { ok: true, id: newUser.user.id };
  });

const updateUserRoleSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(["owner", "admin", "user"]),
});

export const updateUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => updateUserRoleSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireOwner(context);
    if (data.user_id === context.userId) {
      throw new Response("Você não pode alterar o cargo da própria conta", { status: 400 });
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: insertError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: data.user_id, role: data.role }, { onConflict: "user_id,role" });
    if (insertError) throw insertError;

    const { error: deleteError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id)
      .neq("role", data.role);
    if (deleteError) throw deleteError;

    return { ok: true };
  });

const resetPasswordSchema = z.object({ user_id: z.string().uuid() });

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => resetPasswordSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await requireOwner(context);

    const newPassword = Math.random().toString(36).slice(2, 10) + "Aa1!";
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      password: newPassword,
    });
    if (error) throw error;
    return { ok: true, password: newPassword };
  });

const deleteUserSchema = z.object({ user_id: z.string().uuid() });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => deleteUserSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await requireOwner(context);

    if (data.user_id === context.userId) {
      throw new Response("Cannot delete yourself", { status: 400 });
    }

    const { data: targetRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user_id);
    if (targetRoles?.some((r) => r.role === "owner")) {
      throw new Response("Cannot delete owner", { status: 400 });
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw error;
    return { ok: true };
  });
