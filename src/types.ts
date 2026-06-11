export type TetrominoType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";

export interface Point {
  x: number;
  y: number;
}

export type BoardMatrix = string[][]; // Empty cells are represented by "" (empty string) or some hex/tailwind colors. Let's use string.

export interface Tetromino {
  type: TetrominoType;
  matrix: number[][];
  color: string;
  glowColor: string;
}

export interface CurrentPiece {
  type: TetrominoType;
  matrix: number[][];
  color: string;
  glowColor: string;
  x: number;
  y: number;
}

export type GameStatus = "START" | "PLAYING" | "PAUSED" | "GAME_OVER";

export interface HighScore {
  score: number;
  level: number;
  lines: number;
  date: string;
}
