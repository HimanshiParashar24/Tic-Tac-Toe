export type Player = 'X' | 'O';

export type BoardVal = Player | null;

export type BoardState = BoardVal[];

export type GameMode = 'local' | 'ai';

export type AIDifficulty = 'easy' | 'medium' | 'unbeatable';

export interface GameStats {
  xWins: number;
  oWins: number;
  draws: number;
}

export interface HistoryItem {
  board: BoardState;
  index: number | null; // index of the move made, or null for starting state
  player: Player | null; // player who made the move
}
