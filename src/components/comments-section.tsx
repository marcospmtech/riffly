// Seção de comentários de uma música: listar, comentar, responder, votar e (staff) apagar/punir.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ThumbsUp, ThumbsDown, Reply, Trash2, Gavel, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { listComments, createComment, voteComment, deleteComment, getMyPunishment, type CommentRow } from "@/lib/comments.functions";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";
import { supabase } from "@/integrations/supabase/client";
import { ProfileAvatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PunishDialog } from "@/components/punish-dialog";

export function CommentsSection({ songId }: { songId: string }) {
  const { user, isAuthenticated } = useAuth();
  const role = useRole();
  const isStaff = role === "admin" || role === "owner";
  const qc = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["comments", songId],
    queryFn: () => listComments({ data: { song_id: songId } }),
  });

  // Votos do usuário atual, buscados à parte (listComments é pública).
  const commentIds = comments.map((c) => c.id);
  const { data: myVotes } = useQuery({
    queryKey: ["comment-votes", user?.id, commentIds.join(",")],
    queryFn: async () => {
      const { data } = await supabase
        .from("comment_votes")
        .select("comment_id, vote")
        .eq("user_id", user!.id)
        .in("comment_id", commentIds);
      return data ?? [];
    },
    enabled: !!user && commentIds.length > 0,
  });
  const myVoteByComment = new Map((myVotes ?? []).map((v) => [v.comment_id, v.vote as 1 | -1]));

  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [punishTarget, setPunishTarget] = useState<{ userId: string; commentId: string } | null>(null);

  const { data: myPunishment } = useQuery({
    queryKey: ["my-punishment"],
    queryFn: () => getMyPunishment(),
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: (payload: { content: string; parent_id?: string | null }) =>
      createComment({ data: { song_id: songId, content: payload.content, parent_id: payload.parent_id ?? null } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["comments", songId] });
      setNewComment("");
      setReplyText("");
      setReplyTo(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao comentar"),
  });

  const voteMutation = useMutation({
    mutationFn: (payload: { comment_id: string; vote: 1 | -1 }) => voteComment({ data: payload }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["comments", songId] });
      void qc.invalidateQueries({ queryKey: ["comment-votes", user?.id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (comment_id: string) => deleteComment({ data: { comment_id } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["comments", songId] });
      toast.success("Comentário removido");
      setConfirmDeleteId(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao remover comentário"),
  });

  const topLevel = comments.filter((c) => !c.parent_id);
  const repliesOf = (id: string) => comments.filter((c) => c.parent_id === id);

  function renderComment(comment: CommentRow, isReply: boolean) {
    const myVote = myVoteByComment.get(comment.id) ?? null;
    return (
      <div key={comment.id} className={isReply ? "ml-8 mt-3" : "border-b border-border pb-4 last:border-0"}>
        <div className="flex gap-3">
          <Link to="/perfil/$id" params={{ id: comment.user_id }} className="shrink-0">
            <ProfileAvatar avatarPath={comment.author.avatar_path} alt={comment.author.display_name ?? "Usuário"} size="sm" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/perfil/$id"
                params={{ id: comment.user_id }}
                className="text-sm font-semibold text-foreground hover:underline"
              >
                {comment.author.display_name ?? "Usuário"}
              </Link>
              <span className="text-xs text-muted-foreground">
                {new Date(comment.created_at).toLocaleString("pt-BR")}
              </span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{comment.content}</p>

            <div className="mt-2 flex flex-wrap items-center gap-1">
              <button
                type="button"
                disabled={!isAuthenticated}
                onClick={() => voteMutation.mutate({ comment_id: comment.id, vote: 1 })}
                className={`flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 ${
                  myVote === 1 ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <ThumbsUp className={`h-3.5 w-3.5 ${myVote === 1 ? "fill-primary" : ""}`} /> {comment.likes}
              </button>
              <button
                type="button"
                disabled={!isAuthenticated}
                onClick={() => voteMutation.mutate({ comment_id: comment.id, vote: -1 })}
                className={`flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 ${
                  myVote === -1 ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                <ThumbsDown className={`h-3.5 w-3.5 ${myVote === -1 ? "fill-destructive" : ""}`} /> {comment.dislikes}
              </button>

              {!isReply && isAuthenticated && !myPunishment && (
                <button
                  type="button"
                  onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                  className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
                >
                  <Reply className="h-3.5 w-3.5" /> Responder
                </button>
              )}

              {isStaff && (
                <>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(comment.id)}
                    aria-label="Excluir comentário"
                    className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPunishTarget({ userId: comment.user_id, commentId: comment.id })}
                    aria-label="Punir usuário"
                    className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Gavel className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>

            {!isReply && replyTo === comment.id && (
              <div className="mt-3 flex gap-2">
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value.slice(0, 1000))}
                  placeholder="Escreva uma resposta..."
                  className="h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={!replyText.trim() || createMutation.isPending}
                  onClick={() => createMutation.mutate({ content: replyText.trim(), parent_id: comment.id })}
                >
                  Responder
                </Button>
              </div>
            )}

            {!isReply && repliesOf(comment.id).map((r) => renderComment(r, true))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-2xl border border-border bg-card p-4 sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <MessageCircle className="h-4 w-4" /> Comentários ({comments.length})
      </h2>

      {isAuthenticated ? (
        myPunishment ? (
          <p className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            Você está impedido de comentar no momento.
          </p>
        ) : (
          <div className="mb-6 flex gap-2">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value.slice(0, 1000))}
              placeholder="Escreva um comentário..."
              className="h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <Button
              type="button"
              disabled={!newComment.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate({ content: newComment.trim() })}
            >
              Comentar
            </Button>
          </div>
        )
      ) : (
        <p className="mb-6 text-sm text-muted-foreground">
          <Link to="/auth" className="text-primary hover:underline">
            Entre
          </Link>{" "}
          para comentar.
        </p>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Carregando comentários...</p>}
      {!isLoading && topLevel.length === 0 && (
        <p className="text-sm text-muted-foreground">Seja o primeiro a comentar.</p>
      )}

      <div className="space-y-4">{topLevel.map((c) => renderComment(c, false))}</div>

      {confirmDeleteId && (
        <ConfirmDialog
          title="Excluir comentário"
          description="Essa ação não pode ser desfeita. Deseja mesmo excluir este comentário?"
          confirmLabel="Excluir"
          pending={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}

      {punishTarget && (
        <PunishDialog
          userId={punishTarget.userId}
          commentId={punishTarget.commentId}
          canSetPermanent={role === "owner"}
          onClose={() => setPunishTarget(null)}
          onDone={() => setPunishTarget(null)}
        />
      )}
    </div>
  );
}
