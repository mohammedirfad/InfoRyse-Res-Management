"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";

type Disc = { x: number; y: number; vx: number; vy: number; color: "ivory" | "dark" | "queen" | "striker"; r: number };
const SIZE = 420;
const POCKETS: [number, number][] = [[34, 34], [386, 34], [34, 386], [386, 386]];

function freshCoins(): Disc[] {
  const coins: Disc[] = [{ x: 210, y: 210, vx: 0, vy: 0, color: "queen", r: 9 }];
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3;
    coins.push({ x: 210 + Math.cos(angle) * 20, y: 210 + Math.sin(angle) * 20, vx: 0, vy: 0, color: i % 2 ? "dark" : "ivory", r: 9 });
  }
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6;
    coins.push({ x: 210 + Math.cos(angle) * 42, y: 210 + Math.sin(angle) * 42, vx: 0, vy: 0, color: i % 2 ? "ivory" : "dark", r: 9 });
  }
  return coins;
}

export default function CarromGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const coinsRef = useRef<Disc[]>(freshCoins());
  const strikerRef = useRef<Disc>({ x: 210, y: 350, vx: 0, vy: 0, color: "striker", r: 13 });
  const aimRef = useRef<{ x: number; y: number } | null>(null);
  const drawRef = useRef<() => void>(() => {});
  const movingRef = useRef(false);
  const pendingScoreRef = useRef(0);
  const strikerFoulRef = useRef(false);
  const [running, setRunning] = useState(false);
  const [turn, setTurn] = useState(0);
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [shots, setShots] = useState(0);
  const [aiming, setAiming] = useState(false);
  const [notice, setNotice] = useState("Drag the striker backwards, then release to shoot.");
  const remaining = coinsRef.current.length;
  const gameOver = remaining === 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let frame = 0;
    const draw = () => {
      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.fillStyle = "#d5a66e"; ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.fillStyle = "#f5dfbf"; ctx.fillRect(25, 25, 370, 370);
      ctx.strokeStyle = "#724526"; ctx.lineWidth = 4; ctx.strokeRect(25, 25, 370, 370);
      for (const [x, y] of POCKETS) { ctx.beginPath(); ctx.arc(x, y, 23, 0, Math.PI * 2); ctx.fillStyle = "#33251e"; ctx.fill(); }
      ctx.strokeStyle = "#b27a4c"; ctx.lineWidth = 2;
      for (const y of [72, 348]) { ctx.beginPath(); ctx.moveTo(78, y); ctx.lineTo(342, y); ctx.stroke(); ctx.beginPath(); ctx.arc(210, y, 29, 0, Math.PI * 2); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(210, 210, 48, 0, Math.PI * 2); ctx.stroke();
      const drawDisc = (disc: Disc) => {
        ctx.beginPath(); ctx.arc(disc.x, disc.y, disc.r, 0, Math.PI * 2);
        ctx.fillStyle = disc.color === "ivory" ? "#fff9e9" : disc.color === "dark" ? "#342d34" : disc.color === "queen" ? "#d94b54" : "#f0b94e";
        ctx.fill(); ctx.strokeStyle = disc.color === "dark" ? "#17151a" : "#82562f"; ctx.lineWidth = 1.5; ctx.stroke();
        if (disc.color === "striker") { ctx.beginPath(); ctx.arc(disc.x, disc.y, 5, 0, Math.PI * 2); ctx.strokeStyle = "#fff4d1"; ctx.stroke(); }
      };
      coinsRef.current.forEach(drawDisc);
      drawDisc(strikerRef.current);
      const aim = aimRef.current;
      if (aim) {
        ctx.beginPath(); ctx.moveTo(strikerRef.current.x, strikerRef.current.y); ctx.lineTo(aim.x, aim.y);
        ctx.setLineDash([6, 5]); ctx.strokeStyle = "#087b59"; ctx.lineWidth = 3; ctx.stroke(); ctx.setLineDash([]);
      }
    };
    drawRef.current = draw;
    const animate = () => {
      const discs = [...coinsRef.current, strikerRef.current];
      let movingNow = false;
      for (const disc of discs) {
        disc.x += disc.vx; disc.y += disc.vy;
        disc.vx *= 0.985; disc.vy *= 0.985;
        if (Math.abs(disc.vx) < 0.06) disc.vx = 0;
        if (Math.abs(disc.vy) < 0.06) disc.vy = 0;
        if (disc.vx || disc.vy) movingNow = true;
        const min = 46 + disc.r, max = 374 - disc.r;
        if (disc.x < min) { disc.x = min; disc.vx = Math.abs(disc.vx) * 0.72; }
        if (disc.x > max) { disc.x = max; disc.vx = -Math.abs(disc.vx) * 0.72; }
        if (disc.y < min) { disc.y = min; disc.vy = Math.abs(disc.vy) * 0.72; }
        if (disc.y > max) { disc.y = max; disc.vy = -Math.abs(disc.vy) * 0.72; }
      }
      for (let i = 0; i < discs.length; i++) for (let j = i + 1; j < discs.length; j++) {
        const a = discs[i], b = discs[j], dx = b.x - a.x, dy = b.y - a.y;
        const distance = Math.hypot(dx, dy), minDistance = a.r + b.r;
        if (!distance || distance >= minDistance) continue;
        const nx = dx / distance, ny = dy / distance, overlap = minDistance - distance;
        a.x -= nx * overlap / 2; a.y -= ny * overlap / 2; b.x += nx * overlap / 2; b.y += ny * overlap / 2;
        const relative = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (relative > 0) { a.vx -= relative * nx * 0.92; a.vy -= relative * ny * 0.92; b.vx += relative * nx * 0.92; b.vy += relative * ny * 0.92; }
      }
      let scored = 0;
      coinsRef.current = coinsRef.current.filter((coin) => {
        const pocketed = POCKETS.some(([x, y]) => Math.hypot(coin.x - x, coin.y - y) < 24);
        if (pocketed) scored += coin.color === "queen" ? 3 : 1;
        return !pocketed;
      });
      pendingScoreRef.current += scored;
      const strikerPocketed = POCKETS.some(([x, y]) => Math.hypot(strikerRef.current.x - x, strikerRef.current.y - y) < 24);
      if (strikerPocketed) { strikerFoulRef.current = true; strikerRef.current.x = 210; strikerRef.current.y = 350; strikerRef.current.vx = 0; strikerRef.current.vy = 0; }
      if (!movingNow && !coinsRef.current.some((d) => d.vx || d.vy) && !strikerRef.current.vx && !strikerRef.current.vy) {
        movingRef.current = false;
        const turnScore = pendingScoreRef.current;
        pendingScoreRef.current = 0;
        if (turnScore) setScores((previous) => { const next: [number, number] = [...previous]; next[turn] += turnScore; return next; });
        setShots((previous) => previous + 1);
        setTurn((previous) => 1 - previous);
        setNotice(turnScore ? `Nice shot · ${turnScore} point${turnScore === 1 ? "" : "s"} pocketed.` : strikerFoulRef.current ? "Foul · striker pocketed." : "Turn changed. Drag back and shoot.");
        strikerFoulRef.current = false;
        setRunning(false); draw(); return;
      }
      draw(); frame = requestAnimationFrame(animate);
    };
    draw();
    if (running) { movingRef.current = true; frame = requestAnimationFrame(animate); }
    return () => cancelAnimationFrame(frame);
  }, [running, turn]);

  function coords(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * SIZE / rect.width, y: (event.clientY - rect.top) * SIZE / rect.height };
  }
  function pointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (movingRef.current || gameOver) return;
    const point = coords(event), striker = strikerRef.current;
    if (Math.hypot(point.x - striker.x, point.y - striker.y) > striker.r + 14) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    aimRef.current = point; setAiming(true); drawRef.current();
  }
  function pointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!aiming) return;
    aimRef.current = coords(event); drawRef.current();
  }
  function pointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!aiming || !aimRef.current) return;
    const aim = coords(event), striker = strikerRef.current;
    const dx = striker.x - aim.x, dy = striker.y - aim.y;
    const scale = Math.min(0.12, 12 / Math.max(1, Math.hypot(dx, dy)) * 0.12);
    striker.vx = Math.max(-13, Math.min(13, dx * scale)); striker.vy = Math.max(-13, Math.min(13, dy * scale));
    aimRef.current = null; setAiming(false); setRunning(true);
  }
  function moveStriker(direction: number) {
    if (movingRef.current || gameOver) return;
    strikerRef.current.x = Math.max(80, Math.min(340, strikerRef.current.x + direction * 18));
    drawRef.current();
  }
  function reset() {
    coinsRef.current = freshCoins(); strikerRef.current = { x: 210, y: 350, vx: 0, vy: 0, color: "striker", r: 13 };
    aimRef.current = null; pendingScoreRef.current = 0; strikerFoulRef.current = false; setScores([0, 0]); setTurn(0); setShots(0); setAiming(false); setNotice("Drag the striker backwards, then release to shoot."); setRunning(false); drawRef.current();
  }
  const winnerText = scores[0] === scores[1] ? "It’s a tie" : `Player ${scores[0] > scores[1] ? "1" : "2"} wins`;

  return (
    <div className="mx-auto max-w-sm text-center">
      <div className="mb-3 flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700"><span className={turn === 0 ? "text-emerald-800" : "text-slate-400"}>P1 · {scores[0]}</span><span>{gameOver ? winnerText : `Player ${turn + 1} · Shot ${shots + 1}`}</span><span className={turn === 1 ? "text-emerald-800" : "text-slate-400"}>P2 · {scores[1]}</span></div>
      <canvas ref={canvasRef} width={SIZE} height={SIZE} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={() => { aimRef.current = null; setAiming(false); drawRef.current(); }} aria-label="Carrom board. Drag the striker backward and release to shoot." className="mx-auto block aspect-square w-full max-w-[360px] rounded-2xl border-4 border-amber-900 shadow-md" style={{ touchAction: "none" }} />
      <div className="mt-3 flex items-center justify-center gap-3">
        <button type="button" disabled={running || gameOver} onClick={() => moveStriker(-1)} aria-label="Move striker left" className="h-10 w-12 rounded-xl border border-slate-200 bg-white text-xl font-bold disabled:opacity-40">←</button>
        <button type="button" disabled={running || gameOver} onClick={() => moveStriker(1)} aria-label="Move striker right" className="h-10 w-12 rounded-xl border border-slate-200 bg-white text-xl font-bold disabled:opacity-40">→</button>
        <button type="button" onClick={reset} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-950 px-3 text-xs font-bold text-white"><RotateCcw className="h-4 w-4" /> Restart</button>
      </div>
      <p className="mt-3 text-xs text-slate-500" aria-live="polite">{notice} · Pass the phone after each shot.</p>
      <p className="mt-1 text-[11px] text-slate-400">Casual pocket-and-score rules · queen is worth 3 points.</p>
    </div>
  );
}
