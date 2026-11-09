"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, RotateCcw, Sparkles, Trophy, X } from "lucide-react";

const ChessGame = dynamic(() => import("./games/ChessGame"), { ssr: false });
const CarromGame = dynamic(() => import("./games/CarromGame"), { ssr: false });

type Props = { orderStatus: string; onClose: () => void };
type Game = "menu" | "tictactoe" | "connectfour" | "memory" | "chess" | "carrom";

const STATUS_COPY: Record<string, string> = {
  NEW: "Order received · waiting for kitchen",
  ACCEPTED: "Kitchen accepted your order",
  PREPARING: "Your food is being prepared",
  READY: "Your food is ready · please check with staff",
  COMPLETED: "Order completed · enjoy your meal",
  CANCELLED: "This order was cancelled",
};

function statusLabel(status: string) { return STATUS_COPY[status] ?? "Order status is updating"; }

function winnerOf(board: (string | null)[], rows: number, columns: number, length: number) {
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const value = board[row * columns + col];
    if (!value) continue;
    for (const [rowStep, colStep] of directions) {
      const endRow = row + (length - 1) * rowStep;
      const endCol = col + (length - 1) * colStep;
      if (endRow < 0 || endRow >= rows || endCol < 0 || endCol >= columns) continue;
      let wins = true;
      for (let step = 1; step < length; step++) {
        if (board[(row + step * rowStep) * columns + col + step * colStep] !== value) { wins = false; break; }
      }
      if (wins) return value;
    }
  }
  return null;
}

function TicTacToe() {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [turn, setTurn] = useState("X");
  const winner = winnerOf(board, 3, 3, 3);
  const draw = !winner && board.every(Boolean);
  return (
    <div className="mx-auto max-w-sm text-center">
      <p className="mb-4 text-sm font-semibold text-slate-600">{winner ? `${winner === "X" ? "Player 1" : "Player 2"} wins!` : draw ? "It’s a draw!" : `${turn === "X" ? "Player 1" : "Player 2"}’s turn`}</p>
      <div className="mx-auto grid w-fit grid-cols-3 gap-2">
        {board.map((value, index) => (
          <button key={index} type="button" onClick={() => {
            if (value || winner || draw) return;
            const next = [...board]; next[index] = turn; setBoard(next); setTurn(turn === "X" ? "O" : "X");
          }} aria-label={`Cell ${index + 1}${value ? `, ${value}` : ""}`} className="flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-200 bg-white text-4xl font-black text-emerald-900 shadow-sm active:scale-95 sm:h-24 sm:w-24">
            {value}
          </button>
        ))}
      </div>
      <button type="button" onClick={() => { setBoard(Array(9).fill(null)); setTurn("X"); }} className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-950 px-4 text-sm font-bold text-white"><RotateCcw className="h-4 w-4" /> New round</button>
    </div>
  );
}

function ConnectFour() {
  const [board, setBoard] = useState<(string | null)[]>(Array(42).fill(null));
  const [turn, setTurn] = useState("R");
  const winner = winnerOf(board, 6, 7, 4);
  const draw = !winner && board.every(Boolean);
  const winningName = winner === "R" ? "Red" : "Yellow";
  return (
    <div className="mx-auto max-w-lg text-center">
      <p className="mb-3 text-sm font-semibold text-slate-600">{winner ? `${winningName} wins!` : draw ? "It’s a draw!" : `${turn === "R" ? "Red" : "Yellow"}’s turn`}</p>
      <div className="mx-auto grid max-w-[22rem] grid-cols-7 gap-1.5 rounded-2xl bg-blue-800 p-2.5 shadow-inner sm:gap-2 sm:p-3">
        {board.map((value, index) => (
          <button key={index} type="button" onClick={() => {
            if (value || winner || draw) return;
            const col = index % 7;
            let landing = -1;
            for (let row = 5; row >= 0; row--) { const cell = row * 7 + col; if (!board[cell]) { landing = cell; break; } }
            if (landing < 0) return;
            const next = [...board]; next[landing] = turn; setBoard(next); setTurn(turn === "R" ? "Y" : "R");
          }} aria-label={`Column ${(index % 7) + 1}${value ? `, ${value === "R" ? "red" : "yellow"}` : ""}`} className="aspect-square rounded-full bg-white shadow-inner">
            {value && <span className={`block h-full w-full rounded-full ${value === "R" ? "bg-rose-500" : "bg-amber-300"}`} />}
          </button>
        ))}
      </div>
      <button type="button" onClick={() => { setBoard(Array(42).fill(null)); setTurn("R"); }} className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-950 px-4 text-sm font-bold text-white"><RotateCcw className="h-4 w-4" /> New game</button>
    </div>
  );
}

const MEMORY_FACES = ["🍕", "🍜", "🥗", "🍰", "🍔", "🍓", "☕", "🍟"];
function MemoryMatch() {
  const [cards, setCards] = useState(() => [...MEMORY_FACES, ...MEMORY_FACES].map((face, id) => ({ face, id })).sort(() => Math.random() - 0.5));
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const complete = matched.length === cards.length;
  function flip(index: number) {
    if (open.length === 2 || open.includes(index) || matched.includes(index)) return;
    const next = [...open, index]; setOpen(next);
    if (next.length === 2) {
      setMoves((value) => value + 1);
      if (cards[next[0]].face === cards[next[1]].face) {
        setMatched((value) => [...value, ...next]); setOpen([]);
      } else {
        window.setTimeout(() => setOpen([]), 650);
      }
    }
  }
  function restart() {
    setCards((value) => [...value].sort(() => Math.random() - 0.5)); setOpen([]); setMatched([]); setMoves(0);
  }
  return (
    <div className="mx-auto max-w-sm text-center">
      <p className="mb-3 text-sm font-semibold text-slate-600">{complete ? `All pairs found in ${moves} moves!` : `Moves: ${moves} · Find all 8 pairs`}</p>
      <div className="grid grid-cols-4 gap-2">
        {cards.map((card, index) => {
          const visible = open.includes(index) || matched.includes(index);
          return <button key={card.id} type="button" onClick={() => flip(index)} aria-label={visible ? card.face : `Hidden card ${index + 1}`} className={`flex aspect-square items-center justify-center rounded-2xl text-3xl shadow-sm transition active:scale-95 ${visible ? "border border-amber-200 bg-amber-50" : "bg-emerald-900 text-white"}`}>{visible ? card.face : "?"}</button>;
        })}
      </div>
      <button type="button" onClick={restart} className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-950 px-4 text-sm font-bold text-white"><RotateCcw className="h-4 w-4" /> Play again</button>
    </div>
  );
}

export default function GameCenter({ orderStatus, onClose }: Props) {
  const [game, setGame] = useState<Game>("menu");
  const statusIsReady = orderStatus === "READY";
  const games = useMemo(() => [
    { id: "tictactoe" as const, title: "Tic-Tac-Toe", detail: "Two players · pass the phone", icon: "⭕" },
    { id: "connectfour" as const, title: "Connect Four", detail: "Two players · pass the phone", icon: "🔴" },
    { id: "chess" as const, title: "Chess", detail: "Two players · pass the phone", icon: "♟️" },
    { id: "carrom" as const, title: "Carrom", detail: "Two players · take turns shooting", icon: "🟤" },
    { id: "memory" as const, title: "Food Memory", detail: "Solo · find matching pairs", icon: "🍽️" },
  ], []);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Games while you wait" style={{ fontFamily: "inherit" }}>
      <section className="flex max-h-[94dvh] min-h-[70dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-[#FBF7F1] shadow-2xl sm:min-h-[min(680px,90dvh)] sm:rounded-3xl">
        <header className="shrink-0 bg-emerald-950 px-4 py-4 text-white sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {game !== "menu" && <button type="button" onClick={() => setGame("menu")} aria-label="Back to games" className="rounded-xl bg-white/10 p-2 hover:bg-white/20"><ArrowLeft className="h-4 w-4" /></button>}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-300 text-xl text-emerald-950"><Sparkles className="h-5 w-5" /></div>
              <div className="min-w-0"><h2 className="truncate font-extrabold">Games while you wait</h2><p aria-live="polite" className="truncate text-xs text-emerald-100/75">{statusLabel(orderStatus)}</p></div>
            </div>
            <button type="button" onClick={onClose} aria-label="Back to order status" className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl bg-white px-3 text-xs font-bold text-emerald-950"><X className="h-4 w-4" /><span className="hidden sm:inline">Back to order</span></button>
          </div>
          {statusIsReady && <div role="status" className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-amber-300 px-3 py-2 text-xs font-bold text-emerald-950"><span>🎉 Your food is ready. Check with your waiter.</span><button type="button" onClick={onClose} className="shrink-0 underline">View order</button></div>}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {game === "menu" ? (
            <>
              <div className="mb-4"><p className="text-lg font-black text-slate-900">Pick a quick game</p><p className="mt-1 text-sm text-slate-500">Games run on this phone. No sign-in and no game data sent to the restaurant server.</p></div>
              <div className="grid gap-3 sm:grid-cols-2">
                {games.map((entry) => <button key={entry.id} type="button" onClick={() => setGame(entry.id)} className="group flex min-h-24 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-2xl transition group-hover:bg-amber-100">{entry.icon}</span><span className="min-w-0"><span className="block font-extrabold text-slate-900">{entry.title}</span><span className="mt-1 block text-xs text-slate-500">{entry.detail}</span></span><span className="ml-auto text-xs font-bold text-emerald-800">Play →</span></button>)}
              </div>
              <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-xs leading-relaxed text-emerald-950"><Trophy className="mr-2 inline h-4 w-4" />Turn-taking games are local pass-and-play on one phone. Your order status continues updating while you play.</div>
            </>
          ) : game === "tictactoe" ? <TicTacToe />
          : game === "connectfour" ? <ConnectFour />
          : game === "chess" ? <ChessGame />
          : game === "carrom" ? <CarromGame />
          : <MemoryMatch />}
        </div>
      </section>
    </div>
  );
}
