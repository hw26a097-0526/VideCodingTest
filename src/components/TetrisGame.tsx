import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Play, Pause, RotateCcw, Volume2, VolumeX, Shield, Trophy, 
  ArrowLeft, ArrowRight, ArrowDown, ArrowUp, Zap, HelpCircle, CornerUpLeft
} from "lucide-react";
import { 
  TetrominoType, BoardMatrix, CurrentPiece, GameStatus, HighScore 
} from "../types";
import { 
  BOARD_WIDTH, BOARD_HEIGHT, TETROMINOS, LEVEL_SPEEDS, SPEED_MIN 
} from "../utils/constants";
import { sound } from "../utils/audio";

// Initial empty board setup
const createEmptyBoard = (): BoardMatrix => 
  Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(""));

const PARTICLE_COLORS = ["#ef4444", "#3b82f6", "#10b981", "#eab308", "#a855f7", "#ec4899", "#06b6d4"];

// Helper to generate a shuffled bag of all 7 pieces
const generate7Bag = (): TetrominoType[] => {
  const pieces: TetrominoType[] = ["I", "O", "T", "S", "Z", "J", "L"];
  for (let i = pieces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
  }
  return pieces;
};

export default function TetrisGame() {
  // Game states
  const [board, setBoard] = useState<BoardMatrix>(createEmptyBoard());
  const [currentPiece, setCurrentPiece] = useState<CurrentPiece | null>(null);
  const [nextPieceType, setNextPieceType] = useState<TetrominoType | null>(null);
  const [heldPieceType, setHeldPieceType] = useState<TetrominoType | null>(null);
  const [canHold, setCanHold] = useState<boolean>(true);
  
  const [score, setScore] = useState<number>(0);
  const [lines, setLines] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [status, setStatus] = useState<GameStatus>("START");
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [clearingLines, setClearingLines] = useState<number[]>([]);
  const [showControlsHelp, setShowControlsHelp] = useState<boolean>(false);
  const [showTetrisEffect, setShowTetrisEffect] = useState<boolean>(false);

  // Bag of remaining pieces
  const bagRef = useRef<TetrominoType[]>([]);
  // Key press longpress helper or state tracking to prevent multiple repeated triggers
  const keyIntervals = useRef<Record<string, number | null>>({});

  // Fetch a piece from the 7-bag, initializing / replenishing if needed
  const getNextPieceFromBag = useCallback((): TetrominoType => {
    if (bagRef.current.length === 0) {
      bagRef.current = generate7Bag();
    }
    return bagRef.current.shift()!;
  }, []);

  // Load high scores
  useEffect(() => {
    const saved = localStorage.getItem("tetris_high_scores");
    if (saved) {
      try {
        setHighScores(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Save new high score helper
  const saveHighScore = useCallback((finalScore: number, finalLevel: number, finalLines: number) => {
    if (finalScore <= 0) return;
    const newEntry: HighScore = {
      score: finalScore,
      level: finalLevel,
      lines: finalLines,
      date: new Date().toLocaleDateString(),
    };
    setHighScores((prev) => {
      const updated = [...prev, newEntry]
        .sort((a, b) => b.score - a.score)
        .slice(0, 5); // top 5
      localStorage.setItem("tetris_high_scores", JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Collision detection checking
  const checkCollision = useCallback((
    matrix: number[][],
    px: number,
    py: number,
    currentBoard: BoardMatrix
  ): boolean => {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c] !== 0) {
          const boardX = px + c;
          const boardY = py + r;

          // Out of horizontal/downwards boundaries
          if (boardX < 0 || boardX >= BOARD_WIDTH || boardY >= BOARD_HEIGHT) {
            return true;
          }

          // Collides with existing block
          if (boardY >= 0 && currentBoard[boardY][boardX] !== "") {
            return true;
          }
        }
      }
    }
    return false;
  }, []);

  // Create absolute initial spawn position for a tetromino type
  const spawnPiece = useCallback((type: TetrominoType, currentBoard: BoardMatrix) => {
    const spec = TETROMINOS[type];
    const matrix = spec.matrix;
    // Center-ish horizontally
    const x = Math.floor((BOARD_WIDTH - matrix[0].length) / 2);
    // Spawn just above or at top row
    const y = type === "I" ? -1 : 0;

    const newPiece: CurrentPiece = {
      type,
      matrix,
      color: spec.color,
      glowColor: spec.glowColor,
      x,
      y,
    };

    // Game Over check
    if (checkCollision(matrix, x, y, currentBoard)) {
      setStatus("GAME_OVER");
      sound.playGameOver();
      saveHighScore(score, level, lines);
    } else {
      setCurrentPiece(newPiece);
    }
  }, [checkCollision, score, level, lines, saveHighScore]);

  // Handle Game Start
  const startGame = () => {
    sound.playStart();
    const freshBoard = createEmptyBoard();
    setBoard(freshBoard);
    bagRef.current = generate7Bag();
    
    const firstType = getNextPieceFromBag();
    const secondType = getNextPieceFromBag();

    setNextPieceType(secondType);
    setHeldPieceType(null);
    setCanHold(true);
    setScore(0);
    setLines(0);
    setLevel(1);
    
    setStatus("PLAYING");
    spawnPiece(firstType, freshBoard);
  };

  // Sound toggle
  const toggleMute = () => {
    const isNowMuted = sound.toggleMute();
    setIsMuted(isNowMuted);
  };

  // Rotation matrices (standard clockwise)
  const rotateMatrix = (matrix: number[][], clockwise: boolean = true): number[][] => {
    const n = matrix.length;
    const rotated = Array.from({ length: n }, () => Array(n).fill(0));
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (clockwise) {
          rotated[c][n - 1 - r] = matrix[r][c];
        } else {
          rotated[n - 1 - c][r] = matrix[r][c];
        }
      }
    }
    return rotated;
  };

  // Complex Wall Kick Test
  const spinPiece = (clockwise: boolean = true) => {
    if (!currentPiece || status !== "PLAYING") return;

    const nextMatrix = rotateMatrix(currentPiece.matrix, clockwise);
    
    // Wall kick offsets to test depending on space/shape
    const offsets = [
      { dx: 0, dy: 0 },
      { dx: -1, dy: 0 }, // kick right
      { dx: 1, dy: 0 },  // kick left
      { dx: 0, dy: -1 }, // kick up
      { dx: -2, dy: 0 }, // wider kick right
      { dx: 2, dy: 0 },  // wider kick left
    ];

    for (const offset of offsets) {
      const testX = currentPiece.x + offset.dx;
      const testY = currentPiece.y + offset.dy;
      if (!checkCollision(nextMatrix, testX, testY, board)) {
        setCurrentPiece(prev => prev ? {
          ...prev,
          matrix: nextMatrix,
          x: testX,
          y: testY
        } : null);
        sound.playRotate();
        return;
      }
    }
  };

  // Soft/horizontal movement
  const moveHorizontal = (dir: number) => {
    if (!currentPiece || status !== "PLAYING") return;
    const nextX = currentPiece.x + dir;
    if (!checkCollision(currentPiece.matrix, nextX, currentPiece.y, board)) {
      setCurrentPiece(prev => prev ? { ...prev, x: nextX } : null);
      sound.playMove();
    }
  };

  // Computes maximum bottom coordinate (for Ghost guide and fast drops)
  const getGhostY = useCallback((piece: CurrentPiece, targetBoard: BoardMatrix): number => {
    let gy = piece.y;
    while (!checkCollision(piece.matrix, piece.x, gy + 1, targetBoard)) {
      gy++;
    }
    return gy;
  }, [checkCollision]);

  // Merge the active piece into the landing board grid
  const lockPiece = useCallback((piece: CurrentPiece) => {
    sound.playLand();
    
    const newBoard = board.map(row => [...row]);
    for (let r = 0; r < piece.matrix.length; r++) {
      for (let c = 0; c < piece.matrix[r].length; c++) {
        if (piece.matrix[r][c] !== 0) {
          const boardX = piece.x + c;
          const boardY = piece.y + r;
          if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
            newBoard[boardY][boardX] = piece.color;
          }
        }
      }
    }

    // Check complete lines
    const linesToClear: number[] = [];
    for (let r = 0; r < BOARD_HEIGHT; r++) {
      if (newBoard[r].every(cell => cell !== "")) {
        linesToClear.push(r);
      }
    }

    if (linesToClear.length > 0) {
      setClearingLines(linesToClear);
      
      // Delay to play clear animation
      setTimeout(() => {
        const clearedBoard = newBoard.filter((_, idx) => !linesToClear.includes(idx));
        const emptyRows = Array.from(
          { length: BOARD_HEIGHT - clearedBoard.length }, 
          () => Array(BOARD_WIDTH).fill("")
        );
        const finalBoard = [...emptyRows, ...clearedBoard];

        // Scoring rules: 1: 100, 2: 300, 3: 500, 4: 800 * level multiplier
        const scoreBonusList = [0, 100, 300, 500, 800];
        const linesCount = linesToClear.length;
        const pts = (scoreBonusList[linesCount] || 800) * level;

        setScore(prev => prev + pts);

        // 4 lines clear (TETRIS) triggers visual and sound effects
        if (linesCount === 4) {
          sound.playTetris();
          setShowTetrisEffect(true);
          setTimeout(() => {
            setShowTetrisEffect(false);
          }, 1500);
        } else if (linesCount > 0) {
          sound.playLineClear();
        }

        setLines(prevLines => {
          const updatedLines = prevLines + linesCount;
          // Level increments every 10 lines
          const nextLevel = Math.floor(updatedLines / 10) + 1;
          if (nextLevel > level) {
            setLevel(nextLevel);
            if (linesCount !== 4) {
              sound.playLevelUp();
            }
          }
          return updatedLines;
        });

        setBoard(finalBoard);
        setClearingLines([]);
        setCanHold(true);
        
        // Spawn subsequent piece
        const nextType = getNextPieceFromBag();
        spawnPiece(nextPieceType, finalBoard);
        setNextPieceType(nextType);
      }, 200);

    } else {
      setBoard(newBoard);
      setCanHold(true);
      
      const nextType = getNextPieceFromBag();
      spawnPiece(nextPieceType, newBoard);
      setNextPieceType(nextType);
    }
  }, [board, level, nextPieceType, getNextPieceFromBag, spawnPiece, spawnPiece]);

  // Soft Drop function (one step down)
  const softDrop = useCallback(() => {
    if (!currentPiece || status !== "PLAYING") return;
    const nextY = currentPiece.y + 1;
    if (!checkCollision(currentPiece.matrix, currentPiece.x, nextY, board)) {
      setCurrentPiece(prev => prev ? { ...prev, y: nextY } : null);
      setScore(prev => prev + 1); // 1 point for soft drop
    } else {
      lockPiece(currentPiece);
    }
  }, [currentPiece, status, board, checkCollision, lockPiece]);

  // Hard drop instantly snaps and locks block
  const hardDrop = () => {
    if (!currentPiece || status !== "PLAYING") return;
    const gy = getGhostY(currentPiece, board);
    const dropDistance = gy - currentPiece.y;
    
    const snapPiece = {
      ...currentPiece,
      y: gy
    };
    
    setScore(prev => prev + (dropDistance * 2)); // 2 points per block dropped
    lockPiece(snapPiece);
  };

  // Hold a piece
  const holdPiece = () => {
    if (!currentPiece || !canHold || status !== "PLAYING") return;
    sound.playHold();
    
    const currentHeld = heldPieceType;
    setHeldPieceType(currentPiece.type);
    setCanHold(false);

    if (currentHeld === null) {
      // First hold, spawn next piece immediately
      const nextType = getNextPieceFromBag();
      spawnPiece(nextPieceType, board);
      setNextPieceType(nextType);
    } else {
      // Hold replacement spawn
      spawnPiece(currentHeld, board);
    }
  };

  // Game Loop interval based tick
  useEffect(() => {
    if (status !== "PLAYING" || clearingLines.length > 0) return;
    
    // Choose speed according to level, fallback to min interval if lvl super high
    const speed = LEVEL_SPEEDS[level] || Math.max(SPEED_MIN, 130 - (level - 10) * 10);
    const id = setInterval(() => {
      softDrop();
    }, speed);

    return () => clearInterval(id);
  }, [status, level, clearingLines, softDrop]);

  // Key Down listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (status !== "PLAYING") {
        if (e.key === "Enter" || e.key === " ") {
          if (status === "START" || status === "GAME_OVER") {
            startGame();
          } else if (status === "PAUSED") {
            setStatus("PLAYING");
          }
        }
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          moveHorizontal(-1);
          break;
        case "ArrowRight":
        case "d":
        case "D":
          moveHorizontal(1);
          break;
        case "ArrowDown":
        case "s":
        case "S":
          softDrop();
          break;
        case "ArrowUp":
        case "w":
        case "W":
          spinPiece(true); // Rotate clockwise
          break;
        case "z":
        case "Z":
        case "q":
        case "Q":
          spinPiece(false); // Rotate CCW
          break;
        case " ":
          hardDrop();
          break;
        case "Shift":
        case "c":
        case "C":
          holdPiece();
          break;
        case "p":
        case "P":
        case "Escape":
          setStatus("PAUSED");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPiece, board, status, canHold, heldPieceType, nextPieceType, level]);

  // Compute ghost coordinate layout
  const ghostY = currentPiece ? getGhostY(currentPiece, board) : 0;

  // Render a customized small 4x4 preview for held/next pieces
  const renderMiniGrid = (type: TetrominoType | null, prefix: string) => {
    const grid = Array.from({ length: 4 }, () => Array(4).fill(0));
    if (!type) {
      return (
        <div id={`${prefix}-mini-grid-empty`} className="grid grid-cols-4 gap-[2px] bg-slate-950 border border-slate-800 p-2 rounded-lg w-28 h-28 items-center justify-center relative overflow-hidden shadow-inner shadow-black/80">
          <div className="text-slate-600 text-xs text-center font-mono tracking-tight col-span-4 select-none">NONE</div>
        </div>
      );
    }
    const spec = TETROMINOS[type];
    const mat = spec.matrix;

    // Center offset
    const rowOffset = Math.floor((4 - mat.length) / 2);
    const colOffset = Math.floor((4 - mat[0].length) / 2);

    for (let r = 0; r < mat.length; r++) {
      for (let c = 0; c < mat[r].length; c++) {
        if (mat[r][c] !== 0) {
          const gr = r + rowOffset;
          const gc = c + colOffset;
          if (gr >= 0 && gr < 4 && gc >= 0 && gc < 4) {
            grid[gr][gc] = spec.color;
          }
        }
      }
    }

    return (
      <div id={`${prefix}-mini-grid-${type}`} className="grid grid-cols-4 gap-[2px] bg-slate-950 border border-slate-800/80 p-2 rounded-lg w-28 h-28 relative overflow-hidden shadow-inner shadow-black/80">
        {grid.map((row, r) =>
          row.map((color, c) => (
            <div
              key={`${r}-${c}`}
              className="aspect-square rounded-sm"
              style={{
                backgroundColor: color || "rgba(2, 6, 23, 0.7)",
                border: color ? "1px solid rgba(255,255,255,0.25)" : "1px solid rgba(30, 41, 59, 0.15)",
                boxShadow: color 
                  ? `0px 0px 8px ${color}, inset 0 0 4px rgba(255,255,255,0.4)` 
                  : "none"
              }}
            />
          ))
        )}
      </div>
    );
  };

  const renderBoard = (isMobile: boolean = false) => {
    return (
      <div className="w-full h-full grid grid-cols-10 grid-rows-20 gap-[1.5px] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-1 relative">
        {board.map((row, r) =>
          row.map((color, c) => {
            let cellColor = color;
            let isGhost = false;
            let isActive = false;

            // Render active piece cells on the board
            if (currentPiece && status === "PLAYING") {
              const pr = r - currentPiece.y;
              const pc = c - currentPiece.x;
              if (
                pr >= 0 && pr < currentPiece.matrix.length &&
                pc >= 0 && pc < currentPiece.matrix[pr].length &&
                currentPiece.matrix[pr][pc] !== 0
              ) {
                cellColor = currentPiece.color;
                isActive = true;
              }

              // Render ghost piece cells
              if (!isActive) {
                const grMultiplier = r - ghostY;
                if (
                  grMultiplier >= 0 && grMultiplier < currentPiece.matrix.length &&
                  pc >= 0 && pc < currentPiece.matrix[grMultiplier].length &&
                  currentPiece.matrix[grMultiplier][pc] !== 0
                ) {
                  cellColor = currentPiece.color;
                  isGhost = true;
                }
              }
            }

            const isBeingCleared = clearingLines.includes(r);

            return (
              <div
                key={`${r}-${c}`}
                className={`relative aspect-square transition-all duration-75 rounded-[3px] overflow-hidden ${
                  isBeingCleared ? "animate-ping opacity-90 brightness-200" : ""
                }`}
                style={{
                  backgroundColor: cellColor 
                    ? (isGhost ? "transparent" : cellColor) 
                    : "rgba(2, 6, 23, 0.65)",
                  border: isGhost 
                    ? `1px dashed ${cellColor}` 
                    : cellColor 
                      ? "1px solid rgba(255,255,255,0.25)" 
                      : "1px solid rgba(30, 41, 59, 0.15)",
                  boxShadow: isActive && cellColor
                    ? `inset 0px 4px 6px rgba(255,255,255,0.45), 0px 0px 10px ${cellColor}`
                    : isGhost && cellColor
                      ? `inset 0px 1px 4px rgba(255,255,255,0.1), 0px 0px 4px ${cellColor}44`
                      : cellColor && !isGhost
                        ? `inset 0px 2px 4px rgba(255,255,255,0.35), 0px 0px 6px ${cellColor}AA`
                        : "none"
                }}
              >
                {/* Grid cells detail accents */}
                {cellColor && !isGhost && !isBeingCleared && (
                  <div className="absolute top-0.5 left-0.5 w-[50%] h-[40%] bg-white/20 rounded-tl-sm pointer-events-none" />
                )}
              </div>
            );
          })
        )}

        {/* OVERLAYS FOR GAME STATES */}
        <AnimatePresence>
          {status === "START" && (
            <motion.div
              id={`${isMobile ? "mobile-" : ""}overlay-start`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm z-35 flex flex-col items-center justify-center p-2 text-center"
            >
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="mb-1.5 lg:mb-4 shrink-0"
              >
                <Trophy className={`${isMobile ? "w-6 h-6" : "w-12 h-12"} text-indigo-400 mx-auto drop-shadow-[0_0_15px_rgba(129,140,248,0.5)]`} />
              </motion.div>
              <h3 className={`${isMobile ? "text-[10px] tracking-wider" : "text-xl lg:text-2xl tracking-widest"} font-sans font-black text-slate-100 uppercase mb-1`}>
                READY PLAYER ONE
              </h3>
              <p className={`${isMobile ? "text-[8px] max-w-[110px]" : "text-xs max-w-[180px]"} text-slate-400 font-mono mb-3 lg:mb-6 leading-snug`}>
                Classic retro speed tetris arcade.
              </p>

              <button
                id={`${isMobile ? "mobile-" : ""}start-btn`}
                onClick={startGame}
                className="group relative px-3 py-1.5 lg:px-6 lg:py-2.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-md lg:rounded-xl font-bold font-sans tracking-wide shadow-lg shadow-purple-500/20 active:scale-95 transition-all overflow-hidden flex items-center gap-1"
              >
                <span className="relative z-10 flex items-center gap-1 uppercase tracking-widest text-[8px] lg:text-xs">
                  <Play className="w-2.5 h-2.5 lg:w-3.5 lg:h-[14px] fill-white text-white" /> PLAY
                </span>
              </button>
            </motion.div>
          )}

          {status === "PAUSED" && (
            <motion.div
              id={`${isMobile ? "mobile-" : ""}overlay-paused`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm z-35 flex flex-col items-center justify-center p-2 text-center"
            >
              <Pause className={`${isMobile ? "w-6 h-6 mb-1.5" : "w-10 h-10 mb-3"} text-pink-400 mx-auto drop-shadow-[0_0_10px_rgba(244,114,182,0.5)] animate-pulse`} />
              <h3 className={`${isMobile ? "text-[10px] tracking-wider" : "text-lg lg:text-xl tracking-widest"} font-sans font-black text-slate-100 uppercase mb-1`}>
                PAUSED
              </h3>
              <p className={`${isMobile ? "text-[8px] mb-2" : "text-xs mb-4"} text-slate-400 font-mono`}>
                Ready to resume?
              </p>

              <div className="flex gap-1.5">
                <button
                  id={`${isMobile ? "mobile-" : ""}resume-btn`}
                  onClick={() => setStatus("PLAYING")}
                  className="px-2 py-1 lg:px-4 lg:py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-md font-sans font-bold text-[8px] lg:text-xs uppercase tracking-widest"
                >
                  RESUME
                </button>
                <button
                  id={`${isMobile ? "mobile-" : ""}restart-paused-btn`}
                  onClick={startGame}
                  className="px-2 py-1 lg:px-4 lg:py-2 bg-slate-800 hover:bg-slate-700 text-slate-350 rounded-md font-sans font-bold text-[8px] lg:text-xs uppercase tracking-widest border border-slate-700"
                >
                  RESET
                </button>
              </div>
            </motion.div>
          )}

          {status === "GAME_OVER" && (
            <motion.div
              id={`${isMobile ? "mobile-" : ""}overlay-game-over`}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm z-35 flex flex-col items-center justify-center p-2 text-center"
            >
              <span className="text-slate-600 text-[7px] lg:text-[9px] font-mono tracking-[2px] uppercase mb-0.5">
                SPEED TERMINATED
              </span>
              <h3 className="font-sans font-black text-sm lg:text-2xl tracking-wide text-rose-500 uppercase mb-1.5 lg:mb-3 drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]">
                GAME OVER
              </h3>

              <div className="bg-slate-900/90 border border-slate-800/80 p-1.5 lg:p-3 rounded-lg w-full mb-2 lg:mb-4 max-w-[120px] lg:max-w-[180px]">
                <div className="text-[7px] lg:text-[9px] font-mono text-slate-500 uppercase tracking-wider">
                  SCORE
                </div>
                <div className="text-xs lg:text-xl font-sans font-black text-slate-100">
                  {score}
                </div>
              </div>

              <button
                id={`${isMobile ? "mobile-" : ""}retry-btn`}
                onClick={startGame}
                className="px-2 py-1 lg:px-4 lg:py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-md font-bold font-sans tracking-widest text-[8px] lg:text-xs uppercase shadow-md transition-all flex items-center gap-1"
              >
                <RotateCcw className="w-2.5 h-2.5" /> RETRY
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div id="tetris-app-container" className="h-[100dvh] max-h-screen w-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between p-3 select-none overflow-hidden font-sans">
      {/* Visual Title / Top Header */}
      <header id="tetris-header" className="w-full max-w-4xl flex items-center justify-between border-b border-slate-800/60 pb-2 mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
            <span className="font-sans font-black text-lg tracking-tighter text-white">T</span>
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-sans font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">
              NEON TETRIS
            </h1>
            <p className="text-[9px] text-slate-500 font-mono tracking-wider">RETRO ARCADE SYNTH</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="sound-toggle"
            onClick={toggleMute}
            className={`p-1.5 rounded-lg border transition-all ${
              isMuted 
                ? "border-amber-900/40 bg-amber-950/10 text-amber-500" 
                : "border-slate-800 bg-slate-900 text-purple-400 hover:text-purple-300"
            }`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 animate-pulse" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            id="controls-help-btn"
            onClick={() => setShowControlsHelp(true)}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all"
            title="Guide"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* PC & DESKTOP LAYOUT (lg:grid) */}
      <main id="tetris-game-frame-desktop" className="hidden lg:grid w-full max-w-5xl grid-cols-12 gap-6 items-start flex-1 min-h-0 overflow-hidden py-2">
        {/* LEFT COLUMN: Hold Piece */}
        <section id="left-sidebar" className="col-span-3 flex flex-col gap-4 h-full justify-start">
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-4 rounded-xl flex flex-col items-center gap-2 shadow-xl">
            <h2 className="text-xs font-semibold tracking-widest text-slate-400 uppercase font-mono">HOLD PIECE</h2>
            <div className="flex items-center justify-center p-0.5 bg-slate-950 rounded-lg scale-90">
              {renderMiniGrid((status === "PLAYING" || status === "PAUSED") ? heldPieceType : null, "desktop-hold")}
            </div>
            <button
              id="hold-btn"
              onClick={holdPiece}
              disabled={!canHold || status !== "PLAYING"}
              className="mt-1 w-full py-1 px-2 bg-slate-950 border border-slate-800 rounded-md text-[10px] font-mono text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-30 disabled:hover:bg-slate-950 transition-all font-semibold"
            >
              HOLD (SHIFT)
            </button>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-4 rounded-xl shadow-xl">
            <h2 className="text-xs font-semibold tracking-widest text-slate-400 uppercase font-mono mb-2 text-center">KEYBOARD KEYS</h2>
            <div className="space-y-1.5 font-mono text-[9px] text-slate-400">
              <div className="flex justify-between items-center bg-slate-950/60 p-1 px-2 rounded border border-slate-800/40">
                <span>Move Left</span>
                <span className="bg-slate-800 text-white px-1 py-0.5 rounded border border-slate-700">← / A</span>
              </div>
              <div className="flex justify-between items-center bg-slate-950/60 p-1 px-2 rounded border border-slate-800/40">
                <span>Move Right</span>
                <span className="bg-slate-800 text-white px-1 py-0.5 rounded border border-slate-700">→ / D</span>
              </div>
              <div className="flex justify-between items-center bg-slate-950/60 p-1 px-2 rounded border border-slate-800/40">
                <span>Soft Drop</span>
                <span className="bg-slate-800 text-white px-1 py-0.5 rounded border border-slate-700">↓ / S</span>
              </div>
              <div className="flex justify-between items-center bg-slate-950/60 p-1 px-2 rounded border border-slate-800/40">
                <span>Rotate CW</span>
                <span className="bg-slate-800 text-white px-1 py-0.5 rounded border border-slate-700">↑ / W</span>
              </div>
              <div className="flex justify-between items-center bg-slate-950/60 p-1 px-2 rounded border border-slate-800/40">
                <span>Drop Snap</span>
                <span className="bg-slate-800 text-white px-1 py-0.5 rounded border border-slate-700">SPACE</span>
              </div>
            </div>
          </div>
        </section>

        {/* MIDDLE COLUMN: Tetris Game Board Area */}
        <section id="middle-board" className="col-span-6 flex flex-col items-center justify-center h-full">
          <div className="relative w-full max-w-[280px] aspect-[10/20] bg-slate-950 border-4 border-slate-800 rounded-2xl p-2 shadow-[0_0_30px_rgba(30,27,75,0.4)] overflow-hidden">
            {renderBoard(false)}
          </div>
        </section>

        {/* RIGHT COLUMN: Next Piece & Stat Panels */}
        <section id="right-sidebar" className="col-span-3 flex flex-col gap-4 justify-start">
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-4 rounded-xl flex flex-col items-center gap-2 shadow-xl">
            <h2 className="text-xs font-semibold tracking-widest text-slate-400 uppercase font-mono">NEXT PIECE</h2>
            <div className="flex items-center justify-center p-0.5 bg-slate-950 rounded-lg scale-90">
              {renderMiniGrid((status === "PLAYING" || status === "PAUSED") ? nextPieceType : null, "desktop-next")}
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-4 rounded-xl shadow-xl flex flex-col gap-2">
            <h2 className="text-xs font-semibold tracking-widest text-slate-400 uppercase font-mono text-center border-b border-slate-850 pb-1.5">STATISTICS</h2>
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="bg-slate-950/50 border border-slate-800/40 rounded-lg p-2 flex justify-between items-center font-mono">
                <span className="text-slate-500 uppercase tracking-widest text-[9px]">SCORE</span>
                <span className="font-sans font-black text-indigo-400 text-sm">{score}</span>
              </div>
              <div className="bg-slate-950/50 border border-slate-800/40 rounded-lg p-2 flex justify-between items-center font-mono">
                <span className="text-slate-500 uppercase tracking-widest text-[9px]">LEVEL</span>
                <span className="font-sans font-black text-purple-400 text-sm">{level}</span>
              </div>
              <div className="bg-slate-950/50 border border-slate-800/40 rounded-lg p-2 flex justify-between items-center font-mono">
                <span className="text-slate-500 uppercase tracking-widest text-[9px]">LINES</span>
                <span className="font-sans font-black text-pink-400 text-sm">{lines}</span>
              </div>
            </div>

            <div className="flex gap-2 mt-1">
              {status === "PLAYING" ? (
                <button
                  onClick={() => setStatus("PAUSED")}
                  className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[10px] font-mono font-bold tracking-wider uppercase rounded-lg"
                >
                  PAUSE
                </button>
              ) : (
                <button
                  onClick={startGame}
                  className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-mono font-bold tracking-wider uppercase rounded-lg shadow-md"
                >
                  PLAY
                </button>
              )}
              <button
                onClick={startGame}
                disabled={status === "START"}
                className="p-1.5 px-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-slate-100 rounded-lg disabled:opacity-30"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* MOBILE & TABLET COMPACT HUD LAYOUT (<lg) */}
      <main id="tetris-game-frame-mobile" className="flex lg:hidden flex-col items-center justify-center gap-1.5 flex-1 w-full min-h-0 overflow-hidden">
        {/* Compact HUD Horizontal Row: HOLD, BOARD, NEXT */}
        <div className="flex items-center justify-between gap-1 w-full max-w-[350px]">
          {/* Left Mini Column */}
          <div className="flex flex-col gap-1.5 items-center w-[75px] shrink-0">
            <div>
              <span className="text-[9px] font-mono font-bold text-slate-500 tracking-wider">HOLD</span>
            </div>
            <div className="scale-[0.55] sm:scale-[0.65] origin-top h-16 flex items-center justify-center">
              {renderMiniGrid((status === "PLAYING" || status === "PAUSED") ? heldPieceType : null, "mobile-hold")}
            </div>
            <button
              onClick={holdPiece}
              disabled={!canHold || status !== "PLAYING"}
              className="w-full py-1 mt-1 bg-slate-900 border border-slate-800 text-[8px] font-mono font-bold text-slate-400 uppercase rounded active:bg-slate-800 disabled:opacity-20"
            >
              SWAP
            </button>
            
            <div className="mt-2 bg-slate-900/60 border border-slate-800/40 p-1.5 rounded-lg text-center w-full font-mono">
              <div className="text-[7px] text-slate-500 font-bold uppercase">SCORE</div>
              <div className="text-xs font-black text-indigo-400">{score}</div>
            </div>
          </div>

          {/* Center Column: Tetris Board */}
          <div className="relative w-[150px] xs:w-[170px] sm:w-[190px] aspect-[10/20] bg-slate-950 border-4 border-slate-800 rounded-2xl p-1 shadow-[0_0_20px_rgba(30,27,75,0.4)] overflow-hidden shrink-0">
            {renderBoard(true)}
          </div>

          {/* Right Mini Column */}
          <div className="flex flex-col gap-1.5 items-center w-[75px] shrink-0">
            <div>
              <span className="text-[9px] font-mono font-bold text-slate-500 tracking-wider">NEXT</span>
            </div>
            <div className="scale-[0.55] sm:scale-[0.65] origin-top h-16 flex items-center justify-center">
              {renderMiniGrid((status === "PLAYING" || status === "PAUSED") ? nextPieceType : null, "mobile-next")}
            </div>

            <div className="mt-7 bg-slate-900/60 border border-slate-800/40 p-1.5 rounded-lg text-center w-full font-mono space-y-1">
              <div>
                <div className="text-[7px] text-slate-500 font-bold uppercase font-mono">LVL</div>
                <div className="text-xs font-bold text-purple-400">{level}</div>
              </div>
              <div className="border-t border-slate-800/45 pt-1">
                <div className="text-[7px] text-slate-500 font-bold uppercase font-mono">LINES</div>
                <div className="text-xs font-bold text-pink-400">{lines}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Compact Quick Control Bars: Pause / Play on Mobile */}
        <div className="flex gap-2 max-w-[310px] w-full mt-1.5 shrink-0 px-2 justify-center">
          {status === "PLAYING" ? (
            <button
              onClick={() => setStatus("PAUSED")}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 text-[9px] font-mono rounded-lg active:scale-95 flex items-center gap-1 uppercase"
            >
              <Pause className="w-3 h-3 text-pink-400" /> PAUSE
            </button>
          ) : (
            <button
              onClick={startGame}
              className="px-4 py-1.5 bg-indigo-900/40 hover:bg-indigo-900/60 border border-indigo-850 text-indigo-300 text-[9px] font-mono rounded-lg active:scale-95 flex items-center gap-1 uppercase font-bold"
            >
              <Play className="w-3 h-3 fill-indigo-400 text-indigo-400" /> START
            </button>
          )}
          <button
            onClick={startGame}
            disabled={status === "START"}
            className="p-1 px-2.5 bg-slate-900 border border-slate-800 rounded-lg active:scale-95 disabled:opacity-30"
          >
            <RotateCcw className="w-3 h-3 text-slate-400" />
          </button>
        </div>
      </main>

      {/* MOBILE CONTROL PAD: Only visible/interactive on touch viewports */}
      <section id="mobile-control-pad" className="lg:hidden w-full max-w-sm mt-1 bg-slate-900/50 border border-slate-800 p-2 rounded-2xl shadow-xl shrink-0">
        <div className="grid grid-cols-2 gap-4 items-center">
          {/* Left Wing: Move Controls (D-Pad inline style) */}
          <div className="flex items-center justify-around bg-slate-950/60 rounded-xl p-1 border border-slate-800/40">
            <button
              id="mobile-left"
              onClick={() => moveHorizontal(-1)}
              disabled={status !== "PLAYING"}
              className="w-10 h-10 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg flex items-center justify-center text-slate-200 active:scale-90 active:bg-slate-800 select-none disabled:opacity-20"
              title="Move Left"
            >
              <ArrowLeft className="w-5 h-5 text-indigo-400" />
            </button>
            
            <button
              id="mobile-drop"
              onClick={softDrop}
              disabled={status !== "PLAYING"}
              className="w-10 h-10 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg flex items-center justify-center text-slate-200 active:scale-90 active:bg-slate-800 select-none disabled:opacity-20"
              title="Soft Drop"
            >
              <ArrowDown className="w-5 h-5 text-indigo-400" />
            </button>

            <button
              id="mobile-right"
              onClick={() => moveHorizontal(1)}
              disabled={status !== "PLAYING"}
              className="w-10 h-10 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg flex items-center justify-center text-slate-200 active:scale-90 active:bg-slate-800 select-none disabled:opacity-20"
              title="Move Right"
            >
              <ArrowRight className="w-5 h-5 text-indigo-400" />
            </button>
          </div>

          {/* Right Wing: Rotations and Snapping */}
          <div className="grid grid-cols-2 gap-2">
            <button
              id="mobile-rot-cw"
              onClick={() => spinPiece(true)}
              disabled={status !== "PLAYING"}
              className="h-10 bg-slate-950/60 hover:bg-slate-800 border border-slate-800 rounded-lg flex flex-col items-center justify-center text-slate-200 active:scale-90 disabled:opacity-20 select-none"
            >
              <CornerUpLeft className="w-4 h-4 text-purple-400 scale-x-[-1]" />
              <span className="text-[7px] font-mono font-bold tracking-tight mt-0.5">SPIN</span>
            </button>
            <button
              id="mobile-hard-drop"
              onClick={hardDrop}
              disabled={status !== "PLAYING"}
              className="h-10 bg-gradient-to-r from-purple-900/30 to-rose-950/20 border border-purple-800/40 rounded-lg flex flex-col items-center justify-center text-purple-400 active:scale-90 disabled:opacity-20 select-none"
            >
              <Zap className="w-4 h-4 fill-purple-400/20 text-purple-400" />
              <span className="text-[7px] font-mono font-bold tracking-tight mt-0.5">DROP</span>
            </button>
          </div>
        </div>
      </section>

      {/* CONTROLS GUIDE DIALOG MODAL Overlay */}
      <AnimatePresence>
        {showControlsHelp && (
          <motion.div
            id="help-dialog"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowControlsHelp(false)}
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              onClick={e => e.stopPropagation()}
              className="bg-slate-900 border border-slate-800 p-6 rounded-3xl w-full max-w-md shadow-2xl relative"
            >
              <h3 className="font-sans font-black text-lg tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 uppercase mb-4 text-center">
                HOW TO PLAY
              </h3>

              <div className="space-y-4 text-slate-400 text-xs leading-relaxed">
                <div>
                  <h4 className="font-bold text-slate-200 mb-1 font-mono uppercase text-[11px] tracking-wider text-indigo-300">
                    THE OBJECTIVE
                  </h4>
                  <p>
                    Clear full horizontal lines of blocks to score and advance levels. Blocks drop faster as your level increases! Game ends if blocks reach the top.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-200 mb-1 font-mono uppercase text-[11px] tracking-wider text-indigo-300">
                    SCORING BONUS
                  </h4>
                  <ul className="list-disc list-inside space-y-1 font-mono text-[11px]">
                    <li>Single Line: <span className="text-slate-200">100 × level</span> pts</li>
                    <li>Double Line: <span className="text-slate-200">300 × level</span> pts</li>
                    <li>Triple Line: <span className="text-slate-200">500 × level</span> pts</li>
                    <li>TETRIS (4 Lines!): <span className="text-slate-200 font-bold">800 × level</span> pts</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-slate-200 mb-1 font-mono uppercase text-[11px] tracking-wider text-indigo-300">
                    SPECIAL FEATURES
                  </h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li><span className="text-slate-200 font-semibold font-mono">GHOST PIECE:</span> Dashed outline shows landing coordinates.</li>
                    <li><span className="text-slate-200 font-semibold font-mono">HOLD TRAY:</span> Save a block for later using the HOLD trigger.</li>
                    <li><span className="text-slate-200 font-semibold font-mono">WALL KICKS:</span> Allows rotations against obstacles.</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={() => setShowControlsHelp(false)}
                className="mt-6 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-mono text-xs font-bold uppercase tracking-widest border border-slate-700 transition-all"
              >
                CLOSE GUIDE
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Humble literal footer */}
      <footer className="w-full text-center mt-2 mb-1 shrink-0">
        <p className="text-[9px] text-slate-700 font-mono tracking-widest uppercase">
          TETRIS COGNITIVE SIMULATOR &copy; 2026
        </p>
      </footer>

      {/* TETRIS 4-LINE CLEAR OVERLAY EFFECT */}
      <AnimatePresence>
        {showTetrisEffect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center pointer-events-none overflow-hidden bg-transparent"
          >
            {/* Dynamic Radial glow flash */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0, 0.6, 0.3, 0.6, 0], scale: [1, 1.2, 1.1, 1.3, 1] }}
              transition={{ duration: 1.4, ease: "easeInOut" }}
              className="absolute inset-0 bg-radial from-purple-500/30 via-pink-500/10 to-transparent"
            />

            {/* Screen flash pulse (Subtle & Quick) */}
            <motion.div
              animate={{
                backgroundColor: ["rgba(255, 255, 255, 0)", "rgba(168, 85, 247, 0.2)", "rgba(255, 255, 255, 0)"]
              }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="absolute inset-0"
            />

            {/* Exploding grid blocks particles (Confetti - snap-away) */}
            {Array.from({ length: 45 }).map((_, i) => {
              const angle = Math.random() * Math.PI * 2;
              const distance = 100 + Math.random() * 260;
              const tx = Math.cos(angle) * distance;
              const ty = Math.sin(angle) * distance;
              const rColor = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
              const size = 10 + Math.random() * 14;
              const rotation = Math.random() * 720 - 360;

              return (
                <motion.div
                  key={i}
                  initial={{ x: 0, y: 0, scale: 0, rotate: 0, opacity: 1 }}
                  animate={{
                    x: tx,
                    y: ty,
                    scale: [0, 1.2, 0.9, 0.3, 0],
                    rotate: rotation,
                    opacity: [1, 1, 0.8, 0.3, 0],
                  }}
                  transition={{
                    duration: 1.0 + Math.random() * 0.4,
                    ease: "easeOut",
                  }}
                  className="absolute rounded-[3px] border border-white/30 shadow-md"
                  style={{
                    width: size,
                    height: size,
                    backgroundColor: rColor,
                    boxShadow: `0 0 12px ${rColor}`,
                  }}
                />
              );
            })}

            {/* Big 3D Pulsing Rainbow Neon "TETRIS!" Text (Refined for gameplay visibility) */}
            <motion.div
              initial={{ scale: 0.2, rotate: -15, y: 30, opacity: 0 }}
              animate={{
                scale: [0.2, 1.3, 1, 1.1, 0],
                rotate: [-15, 8, -4, 0, 12],
                y: [30, -10, 0, 0, -60],
                opacity: [0, 1, 1, 1, 0]
              }}
              transition={{
                duration: 1.4,
                times: [0, 0.2, 0.35, 0.8, 1],
                ease: "easeInOut"
              }}
              className="relative flex flex-col items-center justify-center select-none"
            >
              {/* Radial glow background around the text */}
              <div className="absolute -inset-10 bg-gradient-to-r from-red-500/20 via-purple-600/30 to-indigo-500/20 rounded-full blur-[40px] pointer-events-none" />
              
              <h1 className="relative text-5xl md:text-8xl font-sans font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-400 to-indigo-400 drop-shadow-[0_4px_20px_rgba(168,85,247,0.7)] uppercase flex gap-1 md:gap-2">
                {["T", "E", "T", "R", "I", "S", "!"].map((char, index) => (
                  <motion.span
                    key={index}
                    animate={{
                      y: [0, -15, 0],
                      scale: [1, 1.12, 1],
                      color: ["#ef4444", "#3b82f6", "#10b981", "#eab308", "#a855f7", "#ec4899", "#06b6d4", "#ef4444"][index % 8]
                    }}
                    transition={{
                      repeat: 2,
                      duration: 0.4,
                      delay: index * 0.05,
                      ease: "easeOut"
                    }}
                    className="inline-block"
                    style={{
                      textShadow: "0 0 15px rgba(255,255,255,0.8), 0 0 30px currentColor"
                    }}
                  >
                    {char}
                  </motion.span>
                ))}
              </h1>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: [0, 0.9, 0.9, 0], scale: [0.8, 1.05, 1, 0.9] }}
                transition={{ delay: 0.2, duration: 1.1 }}
                className="mt-4 font-mono font-black text-xs md:text-lg tracking-widest text-white bg-slate-950/75 px-4 py-1.5 rounded-full border border-pink-500/50 shadow-[0_0_15px_rgba(244,114,182,0.3)]"
              >
                ✨ PERFECT 4-LINE CLEAR ✨
              </motion.div>
            </motion.div>

            {/* Screen Shake during Tetris Effect */}
            <style>{`
              #tetris-app-container {
                animation: ${showTetrisEffect ? "screenShake 0.4s cubic-bezier(.36,.07,.19,.97) both" : "none"};
              }
              @keyframes screenShake {
                10%, 90% { transform: translate3d(-1.5px, 0, 0); }
                20%, 80% { transform: translate3d(2px, 0, 0); }
                30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                40%, 60% { transform: translate3d(4px, 0, 0); }
              }
            `}</style>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

