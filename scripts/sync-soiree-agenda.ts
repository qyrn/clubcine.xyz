import { createClient } from "@supabase/supabase-js";
import { getResolvedSoirees } from "@/data/soirees";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Manque NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY dans l'environnement.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const soirees = getResolvedSoirees();
  const rows = soirees.map((s) => ({
    id: s.def.id,
    title: s.def.title,
    starts_at: new Date(s.startSec * 1000).toISOString(),
    credited_username: s.def.creditedUsername ?? null,
  }));

  const { error: upsertErr } = await supabase
    .from("soiree_agenda")
    .upsert(rows, { onConflict: "id" });
  if (upsertErr) {
    console.error("Upsert KO :", upsertErr.message);
    process.exit(1);
  }

  const keepIds = rows.map((r) => r.id);
  if (keepIds.length > 0) {
    const { error: pruneErr } = await supabase
      .from("soiree_agenda")
      .delete()
      .not("id", "in", `(${keepIds.map((id) => `"${id}"`).join(",")})`);
    if (pruneErr) {
      console.error("Prune KO :", pruneErr.message);
      process.exit(1);
    }
  }

  const { error: resetErr } = await supabase
    .from("soiree_agenda")
    .update({ announced: false })
    .gt("starts_at", new Date().toISOString())
    .eq("announced", true);
  if (resetErr) {
    console.error("Reset announced KO :", resetErr.message);
    process.exit(1);
  }

  console.log(`soiree_agenda synchronisé : ${rows.length} soirée(s).`);
  for (const r of rows) {
    console.log(`  ${r.starts_at}  ${r.id}${r.credited_username ? `  (crédit @${r.credited_username})` : ""}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
