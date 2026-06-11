import { TetrominoType, Tetromino } from "../types";

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

export const SHAPES: Record<TetrominoType, number[][]> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

// Rich neon colors and glows
export const TETROMINOS: Record<TetrominoType, Tetromino> = {
  I: {
    type: "I",
    matrix: SHAPES.I,
    color: "#00f0f0", // Cyan
    glowColor: "rgba(0, 240, 240, 0.6)",
  },
  O: {
    type: "O",
    matrix: SHAPES.O,
    color: "#f2f200", // Yellow
    glowColor: "rgba(242, 242, 0, 0.6)",
  },
  T: {
    type: "T",
    matrix: SHAPES.T,
    color: "#a000f0", // Purple
    glowColor: "rgba(160, 0, 240, 0.6)",
  },
  S: {
    type: "S",
    matrix: SHAPES.S,
    color: "#00f000", // Green
    glowColor: "rgba(0, 240, 0, 0.6)",
  },
  Z: {
    type: "Z",
    matrix: SHAPES.Z,
    color: "#f00000", // Red
    glowColor: "rgba(240, 0, 0, 0.6)",
  },
  J: {
    type: "J",
    matrix: SHAPES.J,
    color: "#0055ff", // Blue
    glowColor: "rgba(0, 85, 255, 0.6)",
  },
  L: {
    type: "L",
    matrix: SHAPES.L,
    color: "#ff7f00", // Orange
    glowColor: "rgba(255, 127, 0, 0.6)",
  },
};

export const LEVEL_SPEEDS: Record<number, number> = {
  1: 1000,
  2: 850,
  3: 700,
  4: 550,
  5: 450,
  6: 370,
  7: 300,
  8: 240,
  9: 180,
  10: 130, // Extremely fast!
};

export const SPEED_MIN = 100; // Minimum interval
