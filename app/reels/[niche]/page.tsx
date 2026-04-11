import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isValidNiche, type Niche } from "@/lib/nicheConfig";
import { nichePageMetadata, nicheLandingJsonLdGraph } from "@/lib/seoConfig";
import JsonLd from "@/app/components/JsonLd";
import HomeClient from "@/app/home-client";

export function generateStaticParams() {
  return (
    [
      "financial",
      "general",
      "world",
      "nation",
      "business",
      "technology",
      "entertainment",
      "sports",
      "science",
      "health",
    ] as const
  ).map((niche) => ({ niche }));
}

export async function generateMetadata({
  params,
}: {
  params: { niche: string };
}): Promise<Metadata> {
  const raw = params.niche;
  if (!isValidNiche(raw)) return {};
  return nichePageMetadata(raw as Niche);
}

export default function NicheReelPage({ params }: { params: { niche: string } }) {
  const raw = params.niche;
  if (!isValidNiche(raw)) notFound();
  const niche = raw as Niche;

  return (
    <>
      <JsonLd data={nicheLandingJsonLdGraph(niche)} />
      <HomeClient initialNiche={niche} nicheLanding />
    </>
  );
}
