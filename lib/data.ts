// ===== data.ts — shared domain types =====

export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;
  color: "cyan" | "magenta" | "green" | "yellow";
  plays: string;
}

export const CATS: ("TODOS" | GameCategory)[] = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"];

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // dd/mm/yyyy
}
