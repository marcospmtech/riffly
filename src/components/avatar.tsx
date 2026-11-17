import { User } from "lucide-react";

export function getAvatarUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  return `/api/avatar?path=${encodeURIComponent(path)}`;
}

const SIZES = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-24 w-24",
} as const;

const ICON_SIZES = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-12 w-12",
} as const;

export function ProfileAvatar({
  avatarPath,
  alt,
  size = "md",
  className = "",
}: {
  avatarPath: string | null | undefined;
  alt: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const src = getAvatarUrl(avatarPath);
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted ${SIZES[size]} ${className}`}
    >
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        // Silhueta genérica (pedida no lugar de uma foto real) — o ícone
        // "User" do lucide já É uma silhueta de cabeça e ombros, então não
        // precisamos manter um arquivo de imagem só pra isso.
        <User className={`${ICON_SIZES[size]} text-muted-foreground`} />
      )}
    </div>
  );
}
