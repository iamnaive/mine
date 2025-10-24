import React, { useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import GameEngine from "../game/GameEngine";
import Leaderboard from "./Leaderboard";

export default function GameApp() {
  const cvsRef = useRef(null);
  const { address, isConnected } = useAccount();

  const [gameState, setGameState] = useState('start'); // 'start', 'playing', 'chest-found', 'cooldown'
  const [stats, setStats] = useState({
    runs: 0,
    best: 0,
    score: 0,
    tickets: 0
  });
  const [lastPlayDate, setLastPlayDate] = useState(null);
  const [cooldownTime, setCooldownTime] = useState(0);

  // Load last play date from localStorage on mount
  useEffect(() => {
    const savedLastPlay = localStorage.getItem('lastPlayDate');
    if (savedLastPlay) {
      setLastPlayDate(savedLastPlay);
    }
  }, []);

  // Update cooldown timer
  useEffect(() => {
    if (gameState === 'cooldown' && cooldownTime > 0) {
      const timer = setInterval(() => {
        setCooldownTime(prev => {
          if (prev <= 1000) {
            setGameState('start');
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [gameState, cooldownTime]);

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
        
        // Set last play date to today
        const today = new Date().toISOString();
        setLastPlayDate(today);
        localStorage.setItem('lastPlayDate', today);
        
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

  const checkCooldown = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastPlay = lastPlayDate ? new Date(lastPlayDate) : null;
    
    if (lastPlay && lastPlay >= today) {
      // Already played today
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const timeLeft = tomorrow.getTime() - now.getTime();
      setCooldownTime(timeLeft);
      return false;
    }
    return true;
  };

  const startGame = () => {
    if (!isConnected) {
      alert('Please connect your wallet to start the game');
      return;
    }
    
    if (!checkCooldown()) {
      setGameState('cooldown');
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
        <p>Connect your wallet and start digging!</p>
        <button className="start-btn" onClick={startGame}>
          {isConnected ? 'Start Game' : 'Connect Wallet'}
        </button>
        <div className="game-info">
          <h3>How to play:</h3>
          <ul>
            <li>WASD/arrows - movement</li>
            <li>Space - jump</li>
            <li>Click blocks - mining</li>
            <li>Find the chest in 3 minutes!</li>
            <li>One game per day</li>
          </ul>
        </div>
        <Leaderboard />
      </div>
    );
  }

  if (gameState === 'chest-found') {
    return (
      <div className="chest-found-screen">
        <div className="chest-message">
          <h1>🎁 Congratulations!</h1>
          <p>You found and opened the chest!</p>
          <p>Final Score: {stats.score}</p>
          <p>Great job, miner!</p>
          <button className="reset-btn" onClick={resetGame}>
            Play Again Tomorrow
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'cooldown') {
    const hours = Math.floor(cooldownTime / (1000 * 60 * 60));
    const minutes = Math.floor((cooldownTime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((cooldownTime % (1000 * 60)) / 1000);
    
    return (
      <div className="cooldown-screen">
        <div className="cooldown-message">
          <h1>⏰ Daily Cooldown</h1>
          <p>You've already played today!</p>
          <p>Next game available in:</p>
          <div className="countdown">
            {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
          </div>
          <button className="reset-btn" onClick={resetGame}>
            Back to Menu
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
    </>
  );
}