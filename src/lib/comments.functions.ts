// Server functions de comentários: listar, criar, votar, apagar (staff) e punir usuário (staff).
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { logAudit, resolveActor } from "@/lib/audit.functions";

// Retorna o cargo do usuário ou lança 403.
async function requireStaffRole(context: {
  supabase: SupabaseClient<Database>;
  userId: string;
}): Promise<"admin" | "owner"> {
  const { data: roles, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .in("role", ["admin", "owner"]);
  if (error) throw error;
  if (!roles || roles.length === 0) throw new Response("Forbidden", { status: 403 });
  return roles.some((r) => r.role === "owner") ? "owner" : "admin";
}

async function getActivePunishment(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data, error } = await context.supabase
    .from("punishments")
    .select("id, expires_at, reason")
    .eq("user_id", context.userId)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export interface CommentAuthor {
  display_name: string | null;
  avatar_path: string | null;
}

export interface CommentRow {
  id: string;
  song_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  author: CommentAuthor;
  likes: number;
  dislikes: number;
  my_vote: 1 | -1 | null;
}

const listCommentsSchema = z.object({ song_id: z.string().uuid() });

export const listComments = createServerFn({ method: "GET" })
  .inputValidator((input) => listCommentsSchema.parse(input))
  .handler(async ({ data }): Promise<CommentRow[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: comments, error } = await supabaseAdmin
      .from("comments")
      .select("*")
      .eq("song_id", data.song_id)
      .order("created_at", { ascending: true });
    if (error) throw error;
    if (!comments || comments.length === 0) return [];

    const userIds = [...new Set(comments.map((c) => c.user_id))];
    const commentIds = comments.map((c) => c.id);

    // Sem FK entre comments e profiles; join manual.
    const [{ data: profiles }, { data: votes }] = await Promise.all([
      supabaseAdmin.from("profiles").select("user_id, display_name, avatar_path").in("user_id", userIds),
      supabaseAdmin.from("comment_votes").select("comment_id, user_id, vote").in("comment_id", commentIds),
    ]);

    const profileByUser = new Map((profiles ?? []).map((p) => [p.user_id, p]));
    const votesByComment = new Map<string, { comment_id: string; user_id: string; vote: number }[]>();
    for (const v of votes ?? []) {
      const list = votesByComment.get(v.comment_id) ?? [];
      list.push(v);
      votesByComment.set(v.comment_id, list);
    }

    return comments.map((c) => {
      const commentVotes = votesByComment.get(c.id) ?? [];
      return {
        ...c,
        author: {
          display_name: profileByUser.get(c.user_id)?.display_name ?? null,
          avatar_path: profileByUser.get(c.user_id)?.avatar_path ?? null,
        },
        likes: commentVotes.filter((v) => v.vote === 1).length,
        dislikes: commentVotes.filter((v) => v.vote === -1).length,
        // Sem auth nesta função; my_vote é resolvido no front via useAuth().
        my_vote: null,
      };
    });
  });

const createCommentSchema = z.object({
  song_id: z.string().uuid(),
  content: z.string().trim().min(1).max(1000),
  parent_id: z.string().uuid().nullable().optional(),
});

export const createComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => createCommentSchema.parse(input))
  .handler(async ({ data, context }) => {
    const punishment = await getActivePunishment(context);
    if (punishment) {
      throw new Response("Você está impedido de comentar no momento", { status: 403 });
    }

    const { data: created, error } = await context.supabase
      .from("comments")
      .insert({
        song_id: data.song_id,
        user_id: context.userId,
        content: data.content,
        parent_id: data.parent_id ?? null,
      })
      .select()
      .single();
    if (error) throw error;

    return created;
  });

const voteSchema = z.object({
  comment_id: z.string().uuid(),
  vote: z.union([z.literal(1), z.literal(-1)]),
});

export const voteComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => voteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: existing, error: readError } = await context.supabase
      .from("comment_votes")
      .select("id, vote")
      .eq("comment_id", data.comment_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (readError) throw readError;

    if (existing && existing.vote === data.vote) {
      // Clicar de novo no mesmo botão remove o voto.
      const { error } = await context.supabase.from("comment_votes").delete().eq("id", existing.id);
      if (error) throw error;
      return { vote: null };
    }

    const { error } = await context.supabase
      .from("comment_votes")
      .upsert(
        { comment_id: data.comment_id, user_id: context.userId, vote: data.vote },
        { onConflict: "comment_id,user_id" },
      );
    if (error) throw error;
    return { vote: data.vote };
  });

const commentIdSchema = z.object({ comment_id: z.string().uuid() });

export const deleteComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => commentIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireStaffRole(context);

    // Captura autor + conteúdo antes de apagar, para o log.
    const { data: deleted, error } = await context.supabase
      .from("comments")
      .delete()
      .eq("id", data.comment_id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!deleted) throw new Response("Comentário não encontrado", { status: 404 });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [actor, author] = await Promise.all([
      resolveActor(supabaseAdmin, context.userId),
      resolveActor(supabaseAdmin, deleted.user_id),
    ]);

    await logAudit(supabaseAdmin, {
      action: "comment_deleted",
      actorId: context.userId,
      actorName: actor.name,
      actorEmail: actor.email,
      targetName: author.name ?? author.email,
      // Trunca o conteúdo no log.
      targetDetail: deleted.content.length > 200 ? `${deleted.content.slice(0, 200)}…` : deleted.content,
    });

    return { ok: true };
  });

const IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const MAX_PROOF_BYTES = 5 * 1024 * 1024;

const punishSchema = z.object({
  user_id: z.string().uuid(),
  comment_id: z.string().uuid().nullable().optional(),
  // "infinity" ou minutos >= 1; só dono pode usar "infinity" (checado no handler).
  duration: z.union([z.literal("infinity"), z.number().int().min(1)]),
  reason: z.string().trim().min(1).max(500),
  proof_content_type: z.enum(["image/png", "image/jpeg", "image/webp"]).nullable().optional(),
  proof_base64: z.string().nullable().optional(),
});

export const punishUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => punishSchema.parse(input))
  .handler(async ({ data, context }) => {
    const role = await requireStaffRole(context);

    if (data.duration === "infinity" && role !== "owner") {
      throw new Response("Somente o dono pode aplicar punição permanente", { status: 403 });
    }

    let proofPath: string | null = null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.proof_base64 && data.proof_content_type) {
      const buffer = Uint8Array.from(atob(data.proof_base64), (c) => c.charCodeAt(0));
      if (buffer.byteLength > MAX_PROOF_BYTES) {
        throw new Response("Imagem de prova muito grande (máx. 5MB)", { status: 400 });
      }
      const ext = IMAGE_TYPES[data.proof_content_type];
      proofPath = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("comment-proofs")
        .upload(proofPath, buffer, { contentType: data.proof_content_type, upsert: false });
      if (uploadError) throw uploadError;
    }

    const expiresAt =
      data.duration === "infinity" ? null : new Date(Date.now() + data.duration * 60_000).toISOString();

    // Substitui qualquer punição ativa anterior do usuário (uma por vez).
    const { error: deleteOldError } = await supabaseAdmin
      .from("punishments")
      .delete()
      .eq("user_id", data.user_id);
    if (deleteOldError) throw deleteOldError;

    const { error: insertError } = await supabaseAdmin.from("punishments").insert({
      user_id: data.user_id,
      admin_id: context.userId,
      reason: data.reason,
      proof_path: proofPath,
      expires_at: expiresAt,
    });
    if (insertError) throw insertError;

    const [actor, target] = await Promise.all([
      resolveActor(supabaseAdmin, context.userId),
      resolveActor(supabaseAdmin, data.user_id),
    ]);

    await logAudit(supabaseAdmin, {
      action: "user_punished",
      actorId: context.userId,
      actorName: actor.name,
      actorEmail: actor.email,
      targetName: target.name ?? target.email,
      targetDetail:
        data.duration === "infinity" ? `Permanente — ${data.reason}` : `${data.duration} min — ${data.reason}`,
    });

    return { ok: true };
  });

export const getMyPunishment = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    return (await getActivePunishment(context)) ?? null;
  });
