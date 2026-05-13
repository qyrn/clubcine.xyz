import { createClient } from "@supabase/supabase-js";
import { SOIREES } from "@/data/soirees";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Manque NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY dans l'environnement.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

interface SuggestionRow {
  user_id: string | null;
  username: string | null;
}

async function main() {
  const now = Date.now();
  const past = SOIREES.filter((s) => Date.parse(s.startISO) < now && s.creditedSuggestionId);

  if (past.length === 0) {
    console.log("Aucune soirée passée avec creditedSuggestionId. Rien à faire.");
    return;
  }

  let awarded = 0;
  let skipped = 0;
  let errors = 0;

  for (const s of past) {
    const sid = s.creditedSuggestionId!;
    const { data, error } = await supabase
      .from("suggestions")
      .select("user_id, username")
      .eq("id", sid)
      .maybeSingle<SuggestionRow>();

    if (error) {
      console.error(`Soirée ${s.id} : lookup suggestion KO :`, error.message);
      errors++;
      continue;
    }
    if (!data?.user_id) {
      console.warn(`Soirée ${s.id} : suggestion ${sid} introuvable ou anonyme, badge non attribué.`);
      skipped++;
      continue;
    }

    const { error: badgeErr } = await supabase.from("user_badges").upsert(
      {
        user_id: data.user_id,
        badge_slug: "soiree-jouee",
        awarded_reason: `soiree:${s.id}`,
      },
      { onConflict: "user_id,badge_slug", ignoreDuplicates: true },
    );

    if (badgeErr) {
      console.error(`Soirée ${s.id} : erreur attribution badge à @${data.username} :`, badgeErr.message);
      errors++;
    } else {
      console.log(`✓ Badge soiree-jouee → @${data.username} (${s.id})`);
      awarded++;
    }
  }

  console.log(`\nRésumé : ${awarded} attribué(s), ${skipped} skip(s), ${errors} erreur(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
