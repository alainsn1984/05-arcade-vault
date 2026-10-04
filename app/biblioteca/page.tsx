import BibliotecaClient from "@/components/BibliotecaClient";
import { createClient } from "@/lib/supabase/server";
import { getGames } from "@/lib/games";

export default async function BibliotecaPage() {
  const supabase = await createClient();
  const games = await getGames(supabase);
  return <BibliotecaClient games={games} />;
}
