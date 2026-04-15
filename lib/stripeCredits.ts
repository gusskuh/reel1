export type CreditPackId = "1" | "3" | "5" | "10" | "20";

export type CreditPack = {
  id: CreditPackId;
  labelUsd: number;
  credits: number;
  envPriceVar:
    | "STRIPE_PRICE_USD_1"
    | "STRIPE_PRICE_USD_3"
    | "STRIPE_PRICE_USD_5"
    | "STRIPE_PRICE_USD_10"
    | "STRIPE_PRICE_USD_20";
};

/** Matches Stripe products / env STRIPE_PRICE_USD_* — amounts per your pricing. */
export const CREDIT_PACKS: CreditPack[] = [
  { id: "1", labelUsd: 1, credits: 1, envPriceVar: "STRIPE_PRICE_USD_1" },
  { id: "3", labelUsd: 3, credits: 3, envPriceVar: "STRIPE_PRICE_USD_3" },
  { id: "5", labelUsd: 5, credits: 5, envPriceVar: "STRIPE_PRICE_USD_5" },
  { id: "10", labelUsd: 10, credits: 15, envPriceVar: "STRIPE_PRICE_USD_10" },
  { id: "20", labelUsd: 20, credits: 18, envPriceVar: "STRIPE_PRICE_USD_20" },
];

export function getCreditPack(tier: string): CreditPack | null {
  return CREDIT_PACKS.find((p) => p.id === tier) ?? null;
}

export function getPriceIdForPack(pack: CreditPack): string | null {
  const v = process.env[pack.envPriceVar]?.trim();
  return v || null;
}
