import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { Game, GameCategory } from "@/lib/data";

type Client = SupabaseClient<Database>;

type GameRow = Database["public"]["Tables"]["games"]["Row"];

function toGame(r: GameRow): Game {
  return {
    id: r.id,
    title: r.title,
    short: r.short,
    long: r.long,
    cat: r.cat as GameCategory,
    cover: r.cover,
    color: r.color as Game["color"],
    plays: r.plays,
  };
}

export async function getGames(client: Client): Promise<Game[]> {
  const { data, error } = await client
    .from("games")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toGame);
}

export async function getGame(client: Client, id: string): Promise<Game | null> {
  const { data, error } = await client
    .from("games")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toGame(data) : null;
}
