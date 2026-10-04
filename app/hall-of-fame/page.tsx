import { createClient } from "@/lib/supabase/server";
import { getGames } from "@/lib/games";
import HallOfFameClient from "@/components/HallOfFameClient";

export default async function HallOfFamePage() {
  const supabase = await createClient();
  const games = await getGames(supabase);
  return <HallOfFameClient games={games} />;
}
