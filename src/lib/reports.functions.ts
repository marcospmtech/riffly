import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Mesma checagem usada em admin.functions.ts — mantida local porque o padrão
// do projeto é duplicar esse guard em cada arquivo de server functions
// (veja songs.functions.ts), em vez de compartilhar um helper.
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

const MONTH_LABELS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export interface MonthlyReportRow {
  month: string;
  adicionadas: number;
  favoritadas: number;
}

export interface MonthlyReportResult {
  year: number;
  rows: MonthlyReportRow[];
  isSnapshot: boolean;
  savedAt: string | null;
}

async function computeLiveReport(
  supabaseAdmin: SupabaseClient<Database>,
  year: number,
): Promise<MonthlyReportRow[]> {
  const rangeStart = `${year}-01-01T00:00:00.000Z`;
  const rangeEnd = `${year + 1}-01-01T00:00:00.000Z`;

  const [songsRes, favoritesRes] = await Promise.all([
    supabaseAdmin
      .from("songs")
      .select("created_at")
      .gte("created_at", rangeStart)
      .lt("created_at", rangeEnd),
    supabaseAdmin
      .from("favorites")
      .select("created_at")
      .gte("created_at", rangeStart)
      .lt("created_at", rangeEnd),
  ]);

  if (songsRes.error) throw songsRes.error;
  if (favoritesRes.error) throw favoritesRes.error;

  const addedByMonth = new Array(12).fill(0);
  for (const row of songsRes.data ?? []) {
    addedByMonth[new Date(row.created_at).getUTCMonth()]++;
  }

  const favoritedByMonth = new Array(12).fill(0);
  for (const row of favoritesRes.data ?? []) {
    favoritedByMonth[new Date(row.created_at).getUTCMonth()]++;
  }

  return MONTH_LABELS.map((month, i) => ({
    month,
    adicionadas: addedByMonth[i],
    favoritadas: favoritedByMonth[i],
  }));
}

const yearSchema = z.object({
  year: z.number().int().min(2000).max(3000),
});

export const getMonthlyReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => yearSchema.parse(input ?? {}))
  .handler(async ({ data, context }): Promise<MonthlyReportResult> => {
    await requireOwner(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Snapshot salvo tem prioridade: se existe, o relatório é considerado
    // "congelado" e não deve recalcular a partir de songs/favorites, que
    // podem ter mudado ou sido apagados desde então.
    const { data: snapshot, error: snapshotError } = await supabaseAdmin
      .from("report_snapshots")
      .select("rows, updated_at")
      .eq("year", data.year)
      .maybeSingle();

    if (snapshotError) throw snapshotError;

    if (snapshot) {
      return {
        year: data.year,
        rows: snapshot.rows as unknown as MonthlyReportRow[],
        isSnapshot: true,
        savedAt: snapshot.updated_at,
      };
    }

    const rows = await computeLiveReport(supabaseAdmin, data.year);
    return { year: data.year, rows, isSnapshot: false, savedAt: null };
  });

export const saveReportSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => yearSchema.parse(input))
  .handler(async ({ data, context }): Promise<MonthlyReportResult> => {
    await requireOwner(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const rows = await computeLiveReport(supabaseAdmin, data.year);

    const { data: saved, error } = await supabaseAdmin
      .from("report_snapshots")
      .upsert(
        {
          year: data.year,
          rows: rows as unknown as Database["public"]["Tables"]["report_snapshots"]["Row"]["rows"],
          created_by: context.userId,
        },
        { onConflict: "year" },
      )
      .select("rows, updated_at")
      .single();

    if (error) throw error;

    return {
      year: data.year,
      rows: saved.rows as unknown as MonthlyReportRow[],
      isSnapshot: true,
      savedAt: saved.updated_at,
    };
  });
