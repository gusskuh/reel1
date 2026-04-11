import type { Metadata } from "next";
import { homePageMetadata, homeFaqJsonLd, rootJsonLdGraph } from "@/lib/seoConfig";
import JsonLd from "./components/JsonLd";
import HomeClient from "./home-client";

export const metadata: Metadata = homePageMetadata();

export default function HomePage() {
  return (
    <>
      <JsonLd data={rootJsonLdGraph()} />
      <JsonLd data={homeFaqJsonLd()} />
      <HomeClient />
    </>
  );
}
