import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, TablesInsert } from "@/integrations/supabase/types";
import { insertMissingManualPunches } from "./manual-punches";

describe("manual completion of missing punches", () => {
  test("preserves the existing entrance and creates only the missing exit", async () => {
    const stored: TablesInsert<"time_entries">[] = [{ employee_id: "employee", tenant_id: "tenant", entry_date: "2026-11-06", entry_type: "entrada", entry_at: "2026-11-06T11:05:00Z", source: "automatico" }];
    const client = {
      from: () => ({
        upsert: (rows: TablesInsert<"time_entries">[], options: { onConflict: string; ignoreDuplicates: boolean }) => ({
          select: async () => {
            assert.equal(options.onConflict, "employee_id,entry_date,entry_type");
            const added: { id: string }[] = [];
            for (const row of rows) {
              const index = stored.findIndex(existing => existing.employee_id === row.employee_id && existing.entry_date === row.entry_date && existing.entry_type === row.entry_type);
              if (index >= 0) {
                if (!options.ignoreDuplicates) stored[index] = row;
              } else {
                stored.push(row);
                added.push({ id: String(stored.length) });
              }
            }
            return { data: added, error: null };
          },
        }),
      }),
    } as unknown as SupabaseClient<Database>;
    const rows: TablesInsert<"time_entries">[] = [
      { employee_id: "employee", tenant_id: "tenant", entry_date: "2026-11-06", entry_type: "entrada", entry_at: "2026-11-06T11:00:00Z", source: "manual_admin" },
      { employee_id: "employee", tenant_id: "tenant", entry_date: "2026-11-06", entry_type: "saida", entry_at: "2026-11-06T20:00:00Z", source: "manual_admin" },
    ];
    assert.deepEqual(await insertMissingManualPunches(client, rows), { created: 1, requested: 2 });
    assert.equal(stored[0].entry_at, "2026-11-06T11:05:00Z");
    assert.equal(stored[0].source, "automatico");
    assert.equal(stored[1].entry_type, "saida");
    assert.deepEqual(await insertMissingManualPunches(client, rows), { created: 0, requested: 2 });
    assert.equal(stored.length, 2);
  });
});