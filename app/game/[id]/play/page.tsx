import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getGame } from "@/lib/games";
import GamePlayer from "@/components/GamePlayer";

export default async function GamePlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const game = await getGame(supabase, id);
  if (!game) notFound();

  return <GamePlayer game={game} />;
}
