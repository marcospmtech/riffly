// Modal genérico de seleção com busca, reusado nos seletores de música/autor/álbum favoritos.
import { useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PickerItem {
  value: string;
  label: string;
  sublabel?: string;
}

export function PickerDialog({
  title,
  placeholder,
  items,
  onSelect,
  onClose,
}: {
  title: string;
  placeholder: string;
  items: PickerItem[];
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filtered = q
    ? items.filter(
        (item) =>
          item.label.toLowerCase().includes(q) || (item.sublabel ?? "").toLowerCase().includes(q),
      )
    : items;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border">
          {filtered.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Nada encontrado.</p>
          ) : (
            filtered.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => onSelect(item.value)}
                className="flex w-full cursor-pointer flex-col border-b border-border px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-background"
              >
                <span className="truncate text-sm font-medium text-foreground">{item.label}</span>
                {item.sublabel && (
                  <span className="truncate text-xs text-muted-foreground">{item.sublabel}</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
