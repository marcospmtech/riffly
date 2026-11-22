// Helpers de fotos de catálogo (autor/álbum): URL da imagem e cor de fundo por status (tem foto ou não).

export function getCatalogPhotoUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  return `/api/catalog-photo?path=${encodeURIComponent(path)}`;
}

// Amarelo (primary, a cor-marca do Riffly) = ainda não tem foto; roxo (riffly-purple) = já tem.
// Opacidade baixa para o texto continuar legível em cima.
export function rowBackground(hasPhoto: boolean): string {
  return hasPhoto ? "bg-riffly-purple/20 hover:bg-riffly-purple/30" : "bg-primary/15 hover:bg-primary/25";
}
