import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BuyCreditsClient from "./buy-credits-client";

export default async function BuyCreditsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/buy-credits")}`);
  }

  return <BuyCreditsClient />;
}
