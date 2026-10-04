import Home from "@/components/Home";
import { createClient } from "@/lib/supabase/server";
import { getGames } from "@/lib/games";
import { getTickerScores, getGlobalTopScores } from "@/lib/scores";

export default async function Page() {
  const supabase = await createClient();
  const [games, ticker, topPlayers] = await Promise.all([
    getGames(supabase),
    getTickerScores(supabase),
    getGlobalTopScores(supabase, 5),
  ]);
  return <Home games={games} ticker={ticker} topPlayers={topPlayers} />;
}
