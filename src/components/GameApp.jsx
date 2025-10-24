import React, { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import GameEngine from "../game/GameEngine";

export default function GameApp() {
  const cvsRef = useRef(null);
  const { address, isConnected } = useAccount();

  const [gameState, setGameState] = useState('start'); // 'start', 'playing', 'chest-found'
  const [stats, setStats] = useState({
    runs: 0,
    best: 0,
    score: 0,
    tickets: 0
  });

  useEffect(() => {
    if (!cvsRef.current || gameState !== 'playing') return;
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
      },
      onChestFound: () => {
        setGameState('chest-found');
      }
    });
    return () => engine.destroy();
  }, [address, isConnected, gameState]);

  const startGame = () => {
    if (!isConnected) {
      alert('Пожалуйста, подключите кошелек для начала игры');
      return;
    }
    setGameState('playing');
  };

  const resetGame = () => {
    setGameState('start');
  };

  if (gameState === 'start') {
    return (
      <div className="start-screen">
        <h2>🏗️ Crypto Mine Game</h2>
        <p>Подключите кошелек и начните копать!</p>
        <button className="start-btn" onClick={startGame}>
          {isConnected ? 'Начать игру' : 'Подключить кошелек'}
        </button>
        <div className="game-info">
          <h3>Как играть:</h3>
          <ul>
            <li>WASD/стрелки - движение</li>
            <li>Пробел - прыжок</li>
            <li>Клик по блокам - копание</li>
            <li>Найдите сундук за 3 минуты!</li>
          </ul>
        </div>
      </div>
    );
  }

  if (gameState === 'chest-found') {
    return (
      <div className="chest-found-screen">
        <div className="chest-message">
          <h1>🎁 Поздравляем!</h1>
          <p>Вы нашли сундук!</p>
          <p>Счет: {stats.score}</p>
          <button className="reset-btn" onClick={resetGame}>
            Играть снова
          </button>
        </div>
      </div>
    );
  }

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