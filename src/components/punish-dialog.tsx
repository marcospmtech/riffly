import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { X, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { punishUser } from "@/lib/comments.functions";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function PunishDialog({
  userId,
  commentId,
  canSetPermanent,
  onClose,
  onDone,
}: {
  userId: string;
  commentId?: string;
  // Só dono pode marcar permanente — quem decide isso é o chamador (que já
  // sabe o cargo de quem está logado via useRole()), não este componente.
  canSetPermanent: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [minutes, setMinutes] = useState("60");
  const [permanent, setPermanent] = useState(false);
  const [reason, setReason] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      let proof_base64: string | null = null;
      let proof_content_type: string | null = null;

      if (proofFile) {
        proof_content_type = proofFile.type;
        proof_base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
          reader.onerror = () => reject(new Error("Falha ao ler a imagem"));
          reader.readAsDataURL(proofFile);
        });
      }

      return punishUser({
        data: {
          user_id: userId,
          comment_id: commentId ?? null,
          duration: permanent ? "infinity" : Math.max(1, parseInt(minutes, 10) || 1),
          reason: reason.trim(),
          proof_content_type: proof_content_type as any,
          proof_base64,
        },
      });
    },
    onSuccess: () => {
      toast.success("Usuário punido");
      onDone();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao punir usuário"),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Use uma imagem PNG, JPEG ou WEBP");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 5MB)");
      return;
    }
    setProofFile(file);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Punir usuário</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Tempo (minutos)</label>
            <input
              type="number"
              min={1}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              disabled={permanent}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
            />
            {canSetPermanent ? (
              <label className="mt-2 flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={permanent}
                  onChange={(e) => setPermanent(e.target.checked)}
                  className="h-4 w-4 cursor-pointer"
                />
                Permanente (infinity)
              </label>
            ) : (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Só o dono pode aplicar punição permanente.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">Motivo</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              rows={3}
              placeholder="Por que essa pessoa está sendo punida..."
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Print do comentário (prova)
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-background text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            >
              <Upload className="h-4 w-4" />
              {proofFile ? proofFile.name : "Anexar imagem (opcional)"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !reason.trim() || (!permanent && !minutes)}
          >
            {mutation.isPending ? "Punindo..." : "Punir"}
          </Button>
        </div>
      </div>
    </div>
  );
}
