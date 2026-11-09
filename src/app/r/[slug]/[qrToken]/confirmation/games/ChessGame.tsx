"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";

type Color = "w" | "b";
type Kind = "K" | "Q" | "R" | "B" | "N" | "P";
type Piece = `${Color}${Kind}`;
type Board = (Piece | null)[][];
type Move = { from: [number, number]; to: [number, number]; enPassant?: boolean; castle?: "K" | "Q" | "k" | "q"; promotion?: boolean };
type Position = { board: Board; turn: Color; rights: string; ep: [number, number] | null };

const glyphs: Record<Piece, string> = {
  wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟",
};
const initialBoard: Board = [
  ["bR", "bN", "bB", "bQ", "bK", "bB", "bN", "bR"],
  Array(8).fill("bP"), ...Array.from({ length: 4 }, () => Array(8).fill(null)),
  Array(8).fill("wP"), ["wR", "wN", "wB", "wQ", "wK", "wB", "wN", "wR"],
] as Board;
const initial = (): Position => ({ board: initialBoard.map((row) => [...row]), turn: "w", rights: "KQkq", ep: null });
const inside = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;
const colorOf = (piece: Piece | null) => piece?.[0] ?? null;
const kindOf = (piece: Piece | null) => piece?.[1] ?? null;

function attacked(board: Board, row: number, col: number, by: Color) {
  const pawnRow = row + (by === "w" ? 1 : -1);
  for (const dc of [-1, 1]) if (inside(pawnRow, col + dc) && board[pawnRow][col + dc] === `${by}P`) return true;
  for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])
    if (inside(row + dr, col + dc) && board[row + dr][col + dc] === `${by}N`) return true;
  for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
    let r = row + dr, c = col + dc, distance = 1;
    while (inside(r, c)) {
      const piece = board[r][c];
      if (piece) {
        if (colorOf(piece) === by) {
          const kind = kindOf(piece);
          if (distance === 1 && kind === "K") return true;
          if (kind === "Q" || (kind === "R" && (dr === 0 || dc === 0)) || (kind === "B" && dr !== 0 && dc !== 0)) return true;
        }
        break;
      }
      r += dr; c += dc; distance++;
    }
  }
  return false;
}

function findKing(board: Board, color: Color): [number, number] {
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (board[r][c] === `${color}K`) return [r, c];
  return [color === "w" ? 7 : 0, 4];
}

function pseudoMoves(position: Position, row: number, col: number): Move[] {
  const { board, turn, rights, ep } = position;
  const piece = board[row][col];
  if (!piece || colorOf(piece) !== turn) return [];
  const kind = kindOf(piece)!;
  const moves: Move[] = [];
  const add = (r: number, c: number, extra: Partial<Move> = {}) => {
    if (inside(r, c) && colorOf(board[r][c]) !== turn) moves.push({ from: [row, col], to: [r, c], ...extra });
  };
  if (kind === "P") {
    const dir = turn === "w" ? -1 : 1;
    const start = turn === "w" ? 6 : 1;
    const promotionRow = turn === "w" ? 0 : 7;
    const one = row + dir;
    if (inside(one, col) && !board[one][col]) {
      add(one, col, one === promotionRow ? { promotion: true } : {});
      if (row === start && !board[row + 2 * dir][col]) add(row + 2 * dir, col);
    }
    for (const dc of [-1, 1]) {
      const r = row + dir, c = col + dc;
      if (!inside(r, c)) continue;
      if (colorOf(board[r][c]) === (turn === "w" ? "b" : "w")) add(r, c, r === promotionRow ? { promotion: true } : {});
      else if (ep?.[0] === r && ep[1] === c) add(r, c, { enPassant: true });
    }
  } else if (kind === "N") {
    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) add(row + dr, col + dc);
  } else if (kind === "K") {
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (dr || dc) add(row + dr, col + dc);
    const home = turn === "w" ? 7 : 0;
    const short = turn === "w" ? "K" : "k", long = turn === "w" ? "Q" : "q";
    const enemy: Color = turn === "w" ? "b" : "w";
    if (row === home && col === 4 && !attacked(board, home, 4, enemy)) {
      if (rights.includes(short) && !board[home][5] && !board[home][6] && board[home][7] === `${turn}R` && !attacked(board, home, 5, enemy) && !attacked(board, home, 6, enemy)) add(home, 6, { castle: short as Move["castle"] });
      if (rights.includes(long) && !board[home][1] && !board[home][2] && !board[home][3] && board[home][0] === `${turn}R` && !attacked(board, home, 3, enemy) && !attacked(board, home, 2, enemy)) add(home, 2, { castle: long as Move["castle"] });
    }
  } else {
    const dirs = kind === "B" ? [[-1,-1],[-1,1],[1,-1],[1,1]] : kind === "R" ? [[-1,0],[1,0],[0,-1],[0,1]] : [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    for (const [dr, dc] of dirs) {
      let r = row + dr, c = col + dc;
      while (inside(r, c)) {
        if (colorOf(board[r][c]) === turn) break;
        moves.push({ from: [row, col], to: [r, c] });
        if (board[r][c]) break;
        r += dr; c += dc;
      }
    }
  }
  return moves;
}

function apply(position: Position, move: Move): Position {
  const board = position.board.map((row) => [...row]);
  const [fr, fc] = move.from, [tr, tc] = move.to;
  const piece = board[fr][fc]!;
  const capture = move.enPassant ? board[fr][tc] : board[tr][tc];
  board[fr][fc] = null;
  if (move.enPassant) board[fr][tc] = null;
  board[tr][tc] = move.promotion ? `${piece[0]}Q` as Piece : piece;
  if (move.castle) {
    const row = piece[0] === "w" ? 7 : 0;
    const kingSide = tc === 6;
    board[row][kingSide ? 5 : 3] = board[row][kingSide ? 7 : 0];
    board[row][kingSide ? 7 : 0] = null;
  }
  let rights = position.rights;
  if (piece === "wK") rights = rights.replace(/[KQ]/g, "");
  if (piece === "bK") rights = rights.replace(/[kq]/g, "");
  const rookRights: Record<string, string> = { "7,0": "Q", "7,7": "K", "0,0": "q", "0,7": "k" };
  for (const [r, c] of [move.from, move.to]) {
    const key = `${r},${c}`;
    if (rookRights[key] && (piece.endsWith("R") || capture?.endsWith("R"))) rights = rights.replace(rookRights[key], "");
  }
  const ep: [number, number] | null = piece.endsWith("P") && Math.abs(tr - fr) === 2 ? [(tr + fr) / 2, fc] : null;
  return { board, turn: position.turn === "w" ? "b" : "w", rights, ep };
}

function legalMoves(position: Position, row: number, col: number) {
  const enemy: Color = position.turn === "w" ? "b" : "w";
  return pseudoMoves(position, row, col).filter((move) => {
    const next = apply(position, move);
    const [kr, kc] = findKing(next.board, position.turn);
    return !attacked(next.board, kr, kc, enemy);
  });
}

function movesForTurn(position: Position) {
  const all: Move[] = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (colorOf(position.board[r][c]) === position.turn) all.push(...legalMoves(position, r, c));
  return all;
}

export default function ChessGame() {
  const [position, setPosition] = useState(initial);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const checkedKing = findKing(position.board, position.turn);
  const inCheck = attacked(position.board, ...checkedKing, position.turn === "w" ? "b" : "w");
  const remaining = useMemo(() => movesForTurn(position).length, [position]);
  const finished = remaining === 0;
  const targetMoves = selected ? legalMoves(position, ...selected) : [];
  const targetKeys = new Set(targetMoves.map((move) => `${move.to[0]},${move.to[1]}`));

  function choose(row: number, col: number) {
    if (selected && targetKeys.has(`${row},${col}`)) {
      const move = targetMoves.find((candidate) => candidate.to[0] === row && candidate.to[1] === col)!;
      setPosition(apply(position, move)); setSelected(null); return;
    }
    if (colorOf(position.board[row][col]) === position.turn) setSelected([row, col]);
    else setSelected(null);
  }

  return (
    <div className="mx-auto max-w-sm text-center">
      <p className="mb-3 text-sm font-semibold text-slate-600" aria-live="polite">
        {finished ? inCheck ? `${position.turn === "w" ? "Black" : "White"} wins by checkmate!` : "Draw by stalemate" : `${position.turn === "w" ? "White" : "Black"} to move${inCheck ? " · Check!" : ""}`}
      </p>
      <div className="grid aspect-square grid-cols-8 overflow-hidden rounded-xl border-4 border-amber-900 shadow-lg">
        {position.board.flatMap((row, r) => row.map((piece, c) => {
          const light = (r + c) % 2 === 0;
          const isSelected = selected?.[0] === r && selected?.[1] === c;
          const target = targetKeys.has(`${r},${c}`);
          return <button key={`${r}-${c}`} type="button" onClick={() => choose(r, c)} aria-label={`${String.fromCharCode(97 + c)}${8-r}${piece ? ` ${piece[0] === "w" ? "white" : "black"} ${piece[1]}` : ""}`} className={`relative flex aspect-square items-center justify-center text-[clamp(1.35rem,7vw,2.6rem)] leading-none ${light ? "bg-[#f0d9b5]" : "bg-[#a66d45]"} ${isSelected ? "!bg-amber-300" : ""}`}>
            {target && !piece && <span className="absolute h-3 w-3 rounded-full bg-emerald-950/30" />}
            {target && piece && <span className="absolute inset-0 border-4 border-emerald-500/70" />}
            {piece && <span className={piece[0] === "w" ? "text-white drop-shadow-[0_1px_2px_#111]" : "text-slate-900"}>{glyphs[piece]}</span>}
          </button>;
        }))}
      </div>
      <p className="mt-3 text-xs text-slate-500">Two players · pass the phone · promotions become queens</p>
      <button type="button" onClick={() => { setPosition(initial()); setSelected(null); }} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-950 px-4 text-sm font-bold text-white"><RotateCcw className="h-4 w-4" /> Restart chess</button>
    </div>
  );
}
