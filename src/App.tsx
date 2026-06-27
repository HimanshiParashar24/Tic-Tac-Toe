import { useState, useEffect } from 'react';
import { 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Home, 
  Users, 
  Cpu, 
  Play, 
  Award, 
  History, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Player, GameMode, AIDifficulty, GameStats, HistoryItem } from './types';
import { checkWinner, isBoardFull, getAIMove } from './utils/ai';
import './App.css';

function App() {
  // Game Setup States
  const [gameMode, setGameMode] = useState<GameMode>('local');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('medium');
  const [userSymbol, setUserSymbol] = useState<Player>('X');
  const [screen, setScreen] = useState<'menu' | 'playing'>('menu');

  // Active Play States
  const [history, setHistory] = useState<HistoryItem[]>([
    { board: Array(9).fill(null), index: null, player: null }
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [isXNext, setIsXNext] = useState<boolean>(true);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Stats State (with localStorage caching)
  const [stats, setStats] = useState<GameStats>(() => {
    const saved = localStorage.getItem('tic-tac-toe-stats');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return { xWins: 0, oWins: 0, draws: 0 };
  });

  // Current Board based on timeline scrubbing
  const currentBoard = history[historyIndex].board;
  const { winner: gameWinner, line: winningLine } = checkWinner(currentBoard);
  const isDraw = !gameWinner && isBoardFull(currentBoard);
  const isGameOver = !!gameWinner || isDraw;
  const isViewingHistory = historyIndex < history.length - 1;

  // Sound Synthesizer using Web Audio API
  const playSound = (type: 'click' | 'win' | 'draw' | 'error') => {
    if (isMuted) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(380, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'win') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(330, now); // E4
        osc.frequency.setValueAtTime(440, now + 0.08); // A4
        osc.frequency.setValueAtTime(554, now + 0.16); // C#5
        osc.frequency.setValueAtTime(660, now + 0.24); // E5
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === 'draw') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.linearRampToValueAtTime(130, now + 0.35);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'error') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(140, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      }
    } catch (e) {
      console.error("Audio Web API error:", e);
    }
  };

  // Launch Confetti on Win
  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.65 },
      colors: ['#00f2fe', '#4facfe', '#ff0844', '#ffb199', '#8b5cf6']
    });
  };

  // AI Opponent Trigger Effect
  useEffect(() => {
    if (
      screen !== 'playing' ||
      gameMode !== 'ai' ||
      historyIndex !== history.length - 1 ||
      isGameOver ||
      isAiThinking
    ) {
      return;
    }

    const isAITurn = isXNext !== (userSymbol === 'X');
    if (!isAITurn) return;

    setIsAiThinking(true);
    const aiPlayer: Player = userSymbol === 'X' ? 'O' : 'X';

    const timer = setTimeout(() => {
      const aiMove = getAIMove(currentBoard, aiPlayer, aiDifficulty);
      if (aiMove !== -1) {
        executeMove(aiMove);
      }
      setIsAiThinking(false);
    }, 600); // Small delay to feel natural

    return () => clearTimeout(timer);
  }, [screen, gameMode, historyIndex, history.length, isXNext, userSymbol, aiDifficulty, isGameOver]);

  const executeMove = (index: number) => {
    const activeBoard = history[historyIndex].board;
    if (activeBoard[index] !== null) {
      playSound('error');
      return;
    }

    const currentPlayer: Player = isXNext ? 'X' : 'O';
    const newBoard = [...activeBoard];
    newBoard[index] = currentPlayer;

    playSound('click');

    // Branch from the current history step in case user is viewing history
    const slicedHistory = history.slice(0, historyIndex + 1);
    const newHistoryItem: HistoryItem = {
      board: newBoard,
      index,
      player: currentPlayer
    };
    const newHistory = [...slicedHistory, newHistoryItem];
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setIsXNext(!isXNext);

    // Evaluate Win / Draw conditions
    const { winner } = checkWinner(newBoard);
    if (winner) {
      playSound('win');
      triggerConfetti();
      setStats(prev => {
        const next = {
          ...prev,
          xWins: winner === 'X' ? prev.xWins + 1 : prev.xWins,
          oWins: winner === 'O' ? prev.oWins + 1 : prev.oWins,
        };
        localStorage.setItem('tic-tac-toe-stats', JSON.stringify(next));
        return next;
      });
    } else if (isBoardFull(newBoard)) {
      playSound('draw');
      setStats(prev => {
        const next = { ...prev, draws: prev.draws + 1 };
        localStorage.setItem('tic-tac-toe-stats', JSON.stringify(next));
        return next;
      });
    }
  };

  const handleCellClick = (index: number) => {
    // Prevent moves if AI is thinking or game is over
    if (isAiThinking || isGameOver) return;
    
    // In AI mode, prevent player from clicking on AI's turn
    if (gameMode === 'ai') {
      const isPlayerTurn = isXNext === (userSymbol === 'X');
      if (!isPlayerTurn) return;
    }

    executeMove(index);
  };

  const startGame = () => {
    playSound('click');
    setHistory([{ board: Array(9).fill(null), index: null, player: null }]);
    setHistoryIndex(0);
    setIsXNext(true);
    setScreen('playing');
  };

  const resetGame = () => {
    playSound('click');
    setHistory([{ board: Array(9).fill(null), index: null, player: null }]);
    setHistoryIndex(0);
    setIsXNext(true);
  };

  const backToMenu = () => {
    playSound('click');
    setScreen('menu');
  };

  const clearStats = () => {
    playSound('click');
    const emptyStats = { xWins: 0, oWins: 0, draws: 0 };
    setStats(emptyStats);
    localStorage.setItem('tic-tac-toe-stats', JSON.stringify(emptyStats));
  };

  return (
    <div className="app-container">
      {/* Background glow structures */}
      <div className="bg-glow-ring-1"></div>
      <div className="bg-glow-ring-2"></div>

      {/* Global Gradient SVG Definitions for Cells */}
      <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
        <defs>
          <linearGradient id="xGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-x-primary)" />
            <stop offset="100%" stopColor="var(--color-x-secondary)" />
          </linearGradient>
          <linearGradient id="oGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-o-primary)" />
            <stop offset="100%" stopColor="var(--color-o-secondary)" />
          </linearGradient>
        </defs>
      </svg>

      {/* Header bar */}
      <div className="header">
        <div className="title-container">
          <h1 className="main-title">Tic-Tac-Toe</h1>
          <p className="subtitle">Neon Arcade</p>
        </div>
        <div className="control-actions">
          <button 
            className="icon-btn" 
            onClick={() => {
              setIsMuted(!isMuted);
              if (isMuted) {
                // Play test click sound right after unmuting
                setTimeout(() => playSound('click'), 50);
              }
            }}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          {screen === 'playing' && (
            <>
              <button className="icon-btn" onClick={resetGame} title="Restart Match">
                <RotateCcw size={18} />
              </button>
              <button className="icon-btn" onClick={backToMenu} title="Return to Menu">
                <Home size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Menu / Settings Screen */}
      {screen === 'menu' && (
        <div className="menu-screen animate-fade-in">
          {/* Game Mode Selection */}
          <div className="menu-section">
            <span className="section-label">Game Mode</span>
            <div className="options-grid">
              <div 
                className={`option-card ${gameMode === 'local' ? 'active' : ''}`}
                onClick={() => { playSound('click'); setGameMode('local'); }}
              >
                <Users className="option-icon" size={24} />
                <span className="option-title">Local Pass</span>
                <span className="option-desc">Play locally with a friend</span>
              </div>
              <div 
                className={`option-card ${gameMode === 'ai' ? 'active' : ''}`}
                onClick={() => { playSound('click'); setGameMode('ai'); }}
              >
                <Cpu className="option-icon" size={24} />
                <span className="option-title">VS Computer</span>
                <span className="option-desc">Play against smart AI</span>
              </div>
            </div>
          </div>

          {/* AI Settings Section (Only shown if mode is AI) */}
          {gameMode === 'ai' && (
            <>
              <div className="menu-section animate-scale-in">
                <span className="section-label">AI Difficulty</span>
                <div className="difficulty-selector">
                  {(['easy', 'medium', 'unbeatable'] as AIDifficulty[]).map((diff) => (
                    <button
                      key={diff}
                      className={`diff-btn ${diff} ${aiDifficulty === diff ? 'active' : ''}`}
                      onClick={() => { playSound('click'); setAiDifficulty(diff); }}
                    >
                      {diff.charAt(0).toUpperCase() + diff.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="menu-section animate-scale-in">
                <span className="section-label">Your Symbol</span>
                <div className="player-selector">
                  <div 
                    className={`player-choice choice-x ${userSymbol === 'X' ? 'active' : ''}`}
                    onClick={() => { playSound('click'); setUserSymbol('X'); }}
                  >
                    <span className="player-choice-icon">X</span>
                    <span className="choice-label">Play First</span>
                  </div>
                  <div 
                    className={`player-choice choice-o ${userSymbol === 'O' ? 'active' : ''}`}
                    onClick={() => { playSound('click'); setUserSymbol('O'); }}
                  >
                    <span className="player-choice-icon">O</span>
                    <span className="choice-label">Play Second</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Local mode info block */}
          {gameMode === 'local' && (
            <div className="menu-section animate-scale-in" style={{ textAlign: 'center', padding: '1rem', background: 'rgba(255,255,255,0.01)', borderRadius: '16px', border: '1px dashed var(--border-color)' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Pass and play mode: Player <strong>X</strong> makes the first move, followed by Player <strong>O</strong>.
              </p>
            </div>
          )}

          {/* Launch Action Button */}
          <button className="action-btn" onClick={startGame}>
            <Play size={18} fill="#fff" />
            <span>Launch Game</span>
          </button>

          {/* Persistent scoreboard overview */}
          <div style={{ marginTop: '0.8rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <span className="section-label" style={{ fontSize: '0.8rem' }}>Lifetime Record</span>
              <button 
                onClick={clearStats}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
                title="Reset stats"
              >
                <RefreshCw size={10} /> Reset stats
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              <div style={{ padding: '0.5rem', background: 'rgba(0, 242, 254, 0.03)', borderRadius: '8px', border: '1px solid rgba(0, 242, 254, 0.05)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-x-primary)', fontWeight: '600' }}>X WINS</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>{stats.xWins}</div>
              </div>
              <div style={{ padding: '0.5rem', background: 'rgba(255, 8, 68, 0.03)', borderRadius: '8px', border: '1px solid rgba(255, 8, 68, 0.05)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-o-primary)', fontWeight: '600' }}>O WINS</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>{stats.oWins}</div>
              </div>
              <div style={{ padding: '0.5rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: '600' }}>DRAWS</div>
                <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>{stats.draws}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Game Layout Screen */}
      {screen === 'playing' && (
        <div className="game-screen animate-fade-in">
          {/* Active Scoreboard */}
          <div className="score-board">
            <div className={`score-card ${isXNext && !isGameOver ? 'active-x' : ''}`}>
              <span className="score-name">Player X</span>
              <span className="score-value">{stats.xWins}</span>
            </div>
            <div className="score-card">
              <span className="score-name">Draws</span>
              <span className="score-value">{stats.draws}</span>
            </div>
            <div className={`score-card ${!isXNext && !isGameOver ? 'active-o' : ''}`}>
              <span className="score-name">Player O</span>
              <span className="score-value">{stats.oWins}</span>
            </div>
          </div>

          {/* Turn / Game Status Banner */}
          <div className="status-indicator">
            <div className={`status-dot active ${isXNext ? 'x-turn' : 'o-turn'}`}></div>
            <div className="status-text">
              {isAiThinking ? (
                <span>AI is analyzing board...</span>
              ) : isGameOver ? (
                <span>Match Complete</span>
              ) : gameMode === 'ai' ? (
                isXNext === (userSymbol === 'X') ? (
                  <span>Your Turn (As <strong className={userSymbol === 'X' ? 'x-text' : 'o-text'}>{userSymbol}</strong>)</span>
                ) : (
                  <span>AI Thinking...</span>
                )
              ) : (
                <span>Player <strong className={isXNext ? 'x-text' : 'o-text'}>{isXNext ? 'X' : 'O'}</strong>'s Turn</span>
              )}
            </div>
          </div>

          {/* Board Grid */}
          <div className="game-grid">
            {currentBoard.map((cellValue, idx) => {
              const isWinningIdx = winningLine?.includes(idx);
              const winningClass = isWinningIdx
                ? gameWinner === 'X' 
                  ? 'winner-cell-x' 
                  : 'winner-cell-o'
                : '';

              return (
                <div
                  key={idx}
                  className={`grid-cell ${winningClass} ${cellValue !== null || isAiThinking || isGameOver ? 'disabled' : ''}`}
                  onClick={() => handleCellClick(idx)}
                >
                  {cellValue === 'X' && (
                    <svg className="symbol-svg animate-scale-in" viewBox="0 0 100 100">
                      <line className="symbol-path symbol-x path-draw" x1="22" y1="22" x2="78" y2="78" />
                      <line className="symbol-path symbol-x path-draw-delay-1" x1="78" y1="22" x2="22" y2="78" />
                    </svg>
                  )}
                  {cellValue === 'O' && (
                    <svg className="symbol-svg animate-scale-in" viewBox="0 0 100 100">
                      <circle className="symbol-path symbol-o path-draw" cx="50" cy="50" r="28" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>

          {/* Time Travel Timeline scrub */}
          {history.length > 1 && (
            <div className="history-slider-container animate-fade-in">
              <div className="history-slider-header">
                <div className="history-slider-title">
                  <History size={13} />
                  <span>Time Travel Timeline</span>
                </div>
                <span className="history-slider-step">
                  Move {historyIndex} / {history.length - 1}
                </span>
              </div>
              <div className="slider-controls">
                <button 
                  className="icon-btn" 
                  onClick={() => { playSound('click'); setHistoryIndex(prev => Math.max(0, prev - 1)); }}
                  disabled={historyIndex === 0}
                  style={{ width: '32px', height: '32px', opacity: historyIndex === 0 ? 0.35 : 1 }}
                  title="Step Backward"
                >
                  <ChevronLeft size={16} />
                </button>
                <input
                  type="range"
                  min={0}
                  max={history.length - 1}
                  value={historyIndex}
                  onChange={(e) => { playSound('click'); setHistoryIndex(parseInt(e.target.value)); }}
                  className="slider-input"
                />
                <button 
                  className="icon-btn" 
                  onClick={() => { playSound('click'); setHistoryIndex(prev => Math.min(history.length - 1, prev + 1)); }}
                  disabled={historyIndex === history.length - 1}
                  style={{ width: '32px', height: '32px', opacity: historyIndex === history.length - 1 ? 0.35 : 1 }}
                  title="Step Forward"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              {isViewingHistory && (
                <div className="history-indicator-msg animate-fade-in">
                  Reviewing history. Playing on the board will branch timeline.
                </div>
              )}
            </div>
          )}

          {/* Action Toolbar */}
          <div className="game-actions-panel">
            <button className="secondary-btn" onClick={backToMenu}>
              <Home size={15} />
              <span>Menu</span>
            </button>
            <button className="secondary-btn" onClick={resetGame}>
              <RotateCcw size={15} />
              <span>Reset</span>
            </button>
          </div>
        </div>
      )}

      {/* Game Over Modal Screen Overlay */}
      {screen === 'playing' && isGameOver && (
        <div className="modal-backdrop animate-fade-in">
          <div className="modal-content animate-scale-in">
            {gameWinner ? (
              <>
                <div className="modal-win-symbol">
                  <Award size={48} className={gameWinner === 'X' ? 'win-text-x' : 'win-text-o'} />
                </div>
                <h2 className="modal-result-title">
                  <span className={gameWinner === 'X' ? 'win-text-x' : 'win-text-o'}>
                    Player {gameWinner}
                  </span> Wins!
                </h2>
                <p className="modal-result-subtitle">
                  {gameMode === 'ai' ? (
                    gameWinner === userSymbol ? (
                      <span>Splendid! You defeated the {aiDifficulty} AI!</span>
                    ) : (
                      <span>The {aiDifficulty} AI outsmarted you. Better luck next time!</span>
                    )
                  ) : (
                    <span>Congratulations on an outstanding match!</span>
                  )}
                </p>
              </>
            ) : (
              <>
                <div className="modal-win-symbol">
                  <Sparkles size={48} className="win-text-draw" />
                </div>
                <h2 className="modal-result-title">
                  <span className="win-text-draw">It's a Draw!</span>
                </h2>
                <p className="modal-result-subtitle">
                  An evenly matched battle of wits! Neither side yielded.
                </p>
              </>
            )}

            <div className="modal-actions">
              <button className="modal-btn-primary" onClick={resetGame}>
                Play Again
              </button>
              <button className="modal-btn-secondary" onClick={backToMenu}>
                Setup Options
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
