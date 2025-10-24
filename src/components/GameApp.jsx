import React, { useEffect, useRef, useState } from "react";
import { useAccount, useSignMessage, useChainId, useSwitchChain } from "wagmi";
import GameEngine from "../game/GameEngine";
import Leaderboard from "./Leaderboard";

export default function GameApp() {
  const cvsRef = useRef(null);
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { signMessageAsync } = useSignMessage();

  const [gameState, setGameState] = useState('start'); // 'start', 'playing', 'chest-found'
  const [stats, setStats] = useState({
    tickets: 0,
    totalClaims: 0
  });
  const [gameEngine, setGameEngine] = useState(null);
  const [canClaimToday, setCanClaimToday] = useState(true);
  const [currentYmd, setCurrentYmd] = useState(null);

  // Load current date from server
  useEffect(() => {
    const fetchCurrentDate = async () => {
      try {
        const response = await fetch('/api/date');
        const data = await response.json();
        if (data.success) {
          setCurrentYmd(data.ymd);
        }
      } catch (error) {
        console.error('Failed to fetch current date:', error);
      }
    };
    
    fetchCurrentDate();
  }, []);

  // Check if user can claim today and load player stats
  useEffect(() => {
    const checkClaimStatusAndLoadStats = async () => {
      if (!address || !currentYmd) return;
      
      try {
        // Check claim status
        const claimResponse = await fetch(`/api/claim?address=${address}&ymd=${currentYmd}`);
        const claimData = await claimResponse.json();
        setCanClaimToday(!claimData.claimed);
        
        // Load player stats
        const playerResponse = await fetch(`/api/players?address=${address}`);
        if (playerResponse.ok) {
          const playerData = await playerResponse.json();
          setStats({
            tickets: playerData.tickets || 0,
            totalClaims: playerData.total_claims || 0
          });
        }
      } catch (error) {
        console.error('Failed to check claim status or load stats:', error);
      }
    };
    
    checkClaimStatusAndLoadStats();
  }, [address, currentYmd]);

  useEffect(() => {
    if (!cvsRef.current || gameState !== 'playing') return;
    const engine = new GameEngine(cvsRef.current, {
      onRunEnd: async (runScore) => {
        // Game ended without finding chest
        setGameState('start');
      },
      onChestFound: async (tickets = 0) => {
        // First, try to claim the chest through the API
        try {
          console.log('Chest found! Starting claim process...', { address, currentYmd, chainId });
          
          // Check network
          if (chainId !== 10143) {
            alert('Please switch to Monad Testnet (Chain ID: 10143) to claim chest!');
            try {
              await switchChain({ chainId: 10143 });
            } catch (switchError) {
              console.error('Failed to switch chain:', switchError);
              alert('Failed to switch to Monad Testnet. Please switch manually.');
            }
            setGameState('start');
            return;
          }
          
          const message = `WE_CHEST:${address}:${currentYmd}`;
          console.log('Message to sign:', message);
          
          // Use wagmi signMessageAsync instead of window.ethereum
          const signature = await signMessageAsync({ 
            message,
            account: address 
          });
          
          console.log('Signature received:', signature);

          // Send claim request
          const response = await fetch('/api/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address: address.toLowerCase(), // Normalize address
              ymd: currentYmd,
              signature
            })
          });

          console.log('API response status:', response.status);
          const data = await response.json();
          console.log('API response data:', data);

          if (data.success && data.status === 'claimed') {
            // Update stats with server response
            setStats(s => ({
              ...s,
              tickets: data.tickets,
              totalClaims: s.totalClaims + 1
            }));
            setCanClaimToday(false);
            setGameState('chest-found');
            
            // Refresh leaderboard after successful claim
            // The Leaderboard component will auto-refresh, but we can trigger it manually
            window.dispatchEvent(new Event('leaderboard-refresh'));
          } else if (data.status === 'already_claimed') {
            alert('You have already claimed your daily chest today!');
            setCanClaimToday(false);
            setGameState('start');
          } else {
            alert('Failed to claim chest: ' + (data.error || 'Unknown error'));
            setGameState('start');
          }
        } catch (error) {
          console.error('Claim error:', error);
          if (error.message.includes('User rejected')) {
            alert('Signature rejected. Please try again and approve the signature.');
          } else {
            alert('Failed to claim chest. Please try again. Error: ' + error.message);
          }
          setGameState('start');
        }
      }
    });
    setGameEngine(engine);
    return () => {
      engine.destroy();
      setGameEngine(null);
    };
  }, [address, isConnected, gameState]);

  const startGame = () => {
    if (!isConnected) {
      alert('Please connect your wallet to start the game');
      return;
    }
    
    if (chainId !== 10143) {
      alert('Please switch to Monad Testnet (Chain ID: 10143) to play!');
      try {
        switchChain({ chainId: 10143 });
      } catch (switchError) {
        console.error('Failed to switch chain:', switchError);
        alert('Failed to switch to Monad Testnet. Please switch manually.');
      }
      return;
    }
    
    if (!canClaimToday) {
      alert('You have already claimed your daily chest today! Come back tomorrow!');
      return;
    }
    
    setGameState('playing');
  };

  const resetGame = () => {
    setGameState('start');
  };

  const claimChest = async () => {
    if (!isConnected || !address || !currentYmd) {
      alert('Please connect your wallet first');
      return;
    }

    if (chainId !== 10143) {
      alert('Please switch to Monad Testnet (Chain ID: 10143) to claim chest!');
      try {
        await switchChain({ chainId: 10143 });
      } catch (switchError) {
        console.error('Failed to switch chain:', switchError);
        alert('Failed to switch to Monad Testnet. Please switch manually.');
      }
      return;
    }

    if (!canClaimToday) {
      alert('You have already claimed your daily chest today!');
      return;
    }

    try {
      // Sign message using wagmi
      const message = `WE_CHEST:${address}:${currentYmd}`;
      const signature = await signMessageAsync({ 
        message,
        account: address 
      });

      // Send claim request
      const response = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: address.toLowerCase(), // Normalize address
          ymd: currentYmd,
          signature
        })
      });

      const data = await response.json();

      if (data.success && data.status === 'claimed') {
        setStats(s => ({
          ...s,
          tickets: data.tickets,
          totalClaims: s.totalClaims + 1
        }));
        setCanClaimToday(false);
        alert(`Chest claimed successfully! Tickets: ${data.tickets}`);
        
        // Refresh leaderboard after successful claim
        window.dispatchEvent(new Event('leaderboard-refresh'));
      } else if (data.status === 'already_claimed') {
        alert('You have already claimed your daily chest today!');
        setCanClaimToday(false);
      } else {
        alert('Failed to claim chest: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Claim error:', error);
      if (error.message.includes('User rejected')) {
        alert('Signature rejected. Please try again and approve the signature.');
      } else {
        alert('Failed to claim chest. Please try again.');
      }
    }
  };

  const handleMobileChestOpen = () => {
    if (gameEngine && gameEngine.chest && !gameEngine.chest.opened) {
      const distance = Math.sqrt(
        Math.pow(gameEngine.player.x - gameEngine.chest.x, 2) + 
        Math.pow(gameEngine.player.y - gameEngine.chest.y, 2)
      );
      
      // If player is close to chest (within 2 blocks)
      if (distance < gameEngine.blockSize * 2) {
        gameEngine.openChest();
      }
    }
  };

      if (gameState === 'start') {
        return (
          <div className="start-screen">
            <h2>🏗️ Crypto Mine Game</h2>
            <p>Connect your wallet and start digging!</p>
            
            {isConnected && (
              <div className="claim-section">
                <p>Daily Chest Available: {canClaimToday ? '✅ Yes' : '❌ No'}</p>
                <p>Your Tickets: {stats.tickets}</p>
                {canClaimToday && (
                  <button 
                    className="claim-btn" 
                    onClick={claimChest}
                  >
                    Claim Daily Chest
                  </button>
                )}
                {!canClaimToday && (
                  <p>You have already claimed your daily chest today!</p>
                )}
              </div>
            )}
            
            <button className="start-btn" onClick={startGame}>
              {isConnected ? 'Start Game' : 'Connect Wallet'}
            </button>
            <div className="game-info">
              <h3>How to play:</h3>
              <ul>
                <li>WASD/arrows - movement</li>
                <li>Space - jump</li>
                <li>Click blocks - mining</li>
                <li>E key - open chest (when nearby)</li>
                <li>Find the chest in 3 minutes!</li>
                <li>One chest per day</li>
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
              <p>🎫 Tickets Earned: 1</p>
              <p>Total Tickets: {stats.tickets}</p>
              <p>Total Claims: {stats.totalClaims}</p>
              <p>Great job, miner!</p>
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
        <div>Total Claims</div>
        <div>{stats.totalClaims}</div>
        <div>Tickets</div>
        <div>{stats.tickets}</div>
        <div>Can Claim Today</div>
        <div>{canClaimToday ? "Yes" : "No"}</div>
      </div>

      <div className="canvas-wrap">
        <canvas 
          ref={cvsRef} 
          width={window.innerWidth} 
          height={window.innerHeight - 100}
          style={{ width: '100vw', height: 'calc(100vh - 100px)' }}
        />
        
        {/* Mobile Controls */}
        <div className="mobile-controls">
          <button 
            className="mobile-btn open-chest"
            onClick={handleMobileChestOpen}
            disabled={!gameEngine?.chest || gameEngine?.chest?.opened}
            title="Open Chest (E)"
          >
            🎁
          </button>
        </div>
      </div>
    </>
  );
}