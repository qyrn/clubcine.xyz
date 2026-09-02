export interface CostLine {
  label: string;
  note: string;
  // Coût mensuel en euros. `null` = à confirmer par l'auteur (rendu « à préciser »).
  monthlyEur: number | null;
}

// Ce que coûte la chaîne chaque mois. Transparence sur /soutiens.
// TODO auteur : remplir `domaine` et `electricite-nas` avec les vrais montants.
export const COSTS: CostLine[] = [
  {
    label: "NAS + électricité",
    note: "Le catalogue tourne sur un NAS à la maison, allumé 24/7.",
    monthlyEur: null,
  },
  {
    label: "Nom de domaine",
    note: "clubcine.xyz, renouvellement annuel ramené au mois.",
    monthlyEur: null,
  },
  {
    label: "Cloudflare",
    note: "CDN + tunnel + cache. Plan gratuit.",
    monthlyEur: 0,
  },
  {
    label: "Supabase",
    note: "Comptes, chat, notifications. Plan gratuit.",
    monthlyEur: 0,
  },
  {
    label: "Vercel",
    note: "Hébergement du site. Plan Hobby, gratuit.",
    monthlyEur: 0,
  },
  {
    label: "Resend",
    note: "Emails de confirmation de compte. Palier gratuit.",
    monthlyEur: 0,
  },
];

export function knownMonthlyTotal(costs: CostLine[]): number {
  return costs.reduce((sum, c) => sum + (c.monthlyEur ?? 0), 0);
}

export function hasUnconfirmedCosts(costs: CostLine[]): boolean {
  return costs.some((c) => c.monthlyEur === null);
}
