import React, { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import GameEngine from "../game/GameEngine";

export default function GameApp() {
  const cvsRef = useRef(null);
  const { address, isConnected } = useAccount();

  const [stats, setStats] = useState({
    runs: 0,
    best: 0,
    score: 0,
    tickets: 0
  });

  useEffect(() => {
    if (!cvsRef.current) return;
    const engine = new GameEngine(cvsRef.current, {
      onRunEnd: async (runScore) => {
        setStats((s) => ({
          ...s,
          runs: s.runs + 1,
          best: Math.max(s.best, runScore),
          score: s.score + runScore
        }));
        try {
          await fetch("/api/players", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              address: address || "guest",
              deltaScore: runScore,
              deltaTickets: runScore > 0 && Math.random() < 0.005 ? 1 : 0
            })
          });
        } catch {
          // ignore for now
        }
      }
    });
    return () => engine.destroy();
  }, [address, isConnected]);

  return (
    <>
      <div className="kv">
        <div>Address</div>
        <div>{isConnected ? address : "Not connected"}</div>
        <div>Total runs</div>
        <div>{stats.runs}</div>
        <div>Best score</div>
        <div>{stats.best}</div>
        <div>Total score</div>
        <div>{stats.score}</div>
        <div>Tickets</div>
        <div>{stats.tickets}</div>
      </div>

      <div className="canvas-wrap">
        <canvas 
          ref={cvsRef} 
          width={window.innerWidth} 
          height={window.innerHeight - 100}
          style={{ width: '100vw', height: 'calc(100vh - 100px)' }}
        />
      </div>
      <p style={{ opacity: 0.7, fontSize: 12 }}>
        Tip: Diamond Yarn drop chance is ~0.5% per chest-equivalent. This demo accrues it to "tickets".
      </p>
    </>
  );
}