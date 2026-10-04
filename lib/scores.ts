import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { ScoreRow } from "@/lib/data";

type Client = SupabaseClient<Database>;

export interface TickerRow {
  player: string;
  gameTitle: string;
  score: number;
  color: string;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const mon = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${mon}/${d.getFullYear()}`;
}

// best score per name, ordered desc, ranked
function bestByName(
  rows: { name: string; score: number; created_at: string }[],
  limit: number
): ScoreRow[] {
  const seen = new Set<string>();
  const out: ScoreRow[] = [];
  for (const r of rows) {
    if (seen.has(r.name)) continue;
    seen.add(r.name);
    out.push({ rank: 0, name: r.name, score: r.score, date: fmtDate(r.created_at) });
    if (out.length >= limit) break;
  }
  return out.map((r, i) => ({ ...r, rank: i + 1 }));
}

export async function getTopScores(
  client: Client,
  gameId: string,
  limit: number
): Promise<ScoreRow[]> {
  const { data, error } = await client
    .from("scores")
    .select("name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false });
  if (error) throw error;
  return bestByName(data ?? [], limit);
}

export async function getGlobalTopScores(client: Client, limit: number): Promise<ScoreRow[]> {
  const { data, error } = await client
    .from("scores")
    .select("name, score, created_at")
    .order("score", { ascending: false });
  if (error) throw error;
  return bestByName(data ?? [], limit);
}

export async function getTickerScores(client: Client, limit = 7): Promise<TickerRow[]> {
  const { data, error } = await client
    .from("scores")
    .select("name, score, game_id, games(title, color)")
    .order("score", { ascending: false });
  if (error) throw error;
  const seen = new Set<string>();
  const out: TickerRow[] = [];
  for (const r of data ?? []) {
    if (!r.games || seen.has(r.game_id)) continue;
    seen.add(r.game_id);
    out.push({ player: r.name, gameTitle: r.games.title, score: r.score, color: r.games.color });
    if (out.length >= limit) break;
  }
  return out;
}

export async function insertScore(
  client: Client,
  { gameId, name, score }: { gameId: string; name: string; score: number }
): Promise<void> {
  const { error } = await client
    .from("scores")
    .insert({ game_id: gameId, name, score, user_id: null });
  if (error) throw error;
}
