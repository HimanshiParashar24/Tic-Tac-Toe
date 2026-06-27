import { BoardState, Player } from '../types';

export const WINNING_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

export function checkWinner(board: BoardState): { winner: Player | null; line: number[] | null } {
  for (const combo of WINNING_COMBOS) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a] as Player, line: combo };
    }
  }
  return { winner: null, line: null };
}

export function isBoardFull(board: BoardState): boolean {
  return board.every(cell => cell !== null);
}

export function getRandomMove(board: BoardState): number {
  const emptyIndices: number[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) {
      emptyIndices.push(i);
    }
  }
  if (emptyIndices.length === 0) return -1;
  const randomIndex = Math.floor(Math.random() * emptyIndices.length);
  return emptyIndices[randomIndex];
}

export function getBestMove(board: BoardState, aiPlayer: Player): number {
  const opponent = aiPlayer === 'X' ? 'O' : 'X';

  function minimax(tempBoard: BoardState, depth: number, isMax: boolean): number {
    const { winner } = checkWinner(tempBoard);
    if (winner === aiPlayer) return 10 - depth;
    if (winner === opponent) return depth - 10;
    if (isBoardFull(tempBoard)) return 0;

    if (isMax) {
      let best = -Infinity;
      for (let i = 0; i < tempBoard.length; i++) {
        if (tempBoard[i] === null) {
          tempBoard[i] = aiPlayer;
          best = Math.max(best, minimax(tempBoard, depth + 1, false));
          tempBoard[i] = null;
        }
      }
      return best;
    } else {
      let best = Infinity;
      for (let i = 0; i < tempBoard.length; i++) {
        if (tempBoard[i] === null) {
          tempBoard[i] = opponent;
          best = Math.min(best, minimax(tempBoard, depth + 1, true));
          tempBoard[i] = null;
        }
      }
      return best;
    }
  }

  let bestVal = -Infinity;
  let bestMove = -1;
  const moves: { index: number; score: number }[] = [];

  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) {
      board[i] = aiPlayer;
      const moveVal = minimax(board, 0, false);
      board[i] = null;
      moves.push({ index: i, score: moveVal });
      if (moveVal > bestVal) {
        bestVal = moveVal;
        bestMove = i;
      }
    }
  }

  const bestMoves = moves.filter(m => m.score === bestVal);
  const randomBest = bestMoves[Math.floor(Math.random() * bestMoves.length)];
  return randomBest ? randomBest.index : bestMove;
}

export function getMediumMove(board: BoardState, aiPlayer: Player): number {
  const opponent = aiPlayer === 'X' ? 'O' : 'X';

  // 1. Check if we can win in one move
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) {
      board[i] = aiPlayer;
      const { winner } = checkWinner(board);
      board[i] = null;
      if (winner === aiPlayer) return i;
    }
  }

  // 2. Check if we need to block opponent
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) {
      board[i] = opponent;
      const { winner } = checkWinner(board);
      board[i] = null;
      if (winner === opponent) return i;
    }
  }

  // 3. 60% chance to play minimax move, 40% chance to play random move
  if (Math.random() < 0.6) {
    return getBestMove(board, aiPlayer);
  } else {
    // Try to play center first if open
    if (board[4] === null) return 4;
    return getRandomMove(board);
  }
}

export function getAIMove(board: BoardState, aiPlayer: Player, difficulty: 'easy' | 'medium' | 'unbeatable'): number {
  switch (difficulty) {
    case 'easy':
      return getRandomMove(board);
    case 'medium':
      return getMediumMove(board, aiPlayer);
    case 'unbeatable':
      return getBestMove(board, aiPlayer);
    default:
      return getRandomMove(board);
  }
}
