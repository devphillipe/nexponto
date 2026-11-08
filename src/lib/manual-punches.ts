import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TablesInsert } from "@/integrations/supabase/types";

/** Completes missing punches without changing any existing timestamp or audit data. */
export async function insertMissingManualPunches(
  client: SupabaseClient<Database>,
  rows: TablesInsert<"time_entries">[],
) {
  if (!rows.length) throw new Error("Nenhum registro para salvar.");
  const { data, error } = await client
    .from("time_entries")
    .upsert(rows, {
      onConflict: "employee_id,entry_date,entry_type",
      ignoreDuplicates: true,
    })
    .select("id");
  if (error) throw error;
  return { created: data?.length ?? 0, requested: rows.length };
}