import { createClient } from "@/lib/supabase/server";
import BuyCreditsClient from "./buy-credits-client";

export default async function BuyCreditsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <BuyCreditsClient isLoggedIn={!!user} />;
}
