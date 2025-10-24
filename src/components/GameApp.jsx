import React, { useEffect, useRef, useState } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { signMessage } from "@wagmi/core";
import { config } from "../wagmi";
import GameEngine from "../game/GameEngine";
import Leaderboard from "./Leaderboard";

// Helper function for signing with wagmi or fallback
async function signWithWagmiOrFallback(address, message) {
  try {
    // wagmi v2 requires config + account
    const sig = await signMessage(config, { account: address, message });
    return sig;
  } catch (e) {
    console.warn("[MINE] wagmi signMessage failed, trying personal_sign fallback", e);
    // Fallback to window.ethereum if available
    const eth = globalThis.ethereum;
    if (!eth) throw new Error("No ethereum provider for personal_sign");
    // important: personal_sign params order = [message, address]
    const sig = await eth.request({ method: "personal_sign", params: [message, address] });
    return sig;
  }
}

export default function GameApp() {
  const cvsRef = useRef(null);
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

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
          
          // Check network and force switch if needed
          if (chainId !== 10143) {
            console.log('Wrong network detected:', chainId, 'Expected: 10143');
            alert('Please switch to Monad Testnet (Chain ID: 10143) to claim chest!');
            try {
              console.log('Attempting to switch to Monad Testnet...');
              await switchChain({ chainId: 10143 });
              
              // Wait a moment for the chain to switch
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // Check if switch was successful
              if (chainId !== 10143) {
                alert('Network switch failed. Please switch to Monad Testnet manually and try again.');
                setGameState('start');
                return;
              }
            } catch (switchError) {
              console.error('Failed to switch chain:', switchError);
              alert('Failed to switch to Monad Testnet. Please switch manually and try again.');
              setGameState('start');
              return;
            }
          }
          
          const message = `WE_CHEST:${address}:${currentYmd}`;
          console.log('Message to sign:', message);
          
          // Use wagmi signMessage with fallback
          const signature = await signWithWagmiOrFallback(address, message);
          
          console.log('Signature received:', signature);

          // Send claim request
          const response = await fetch('/api/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address: address, // Keep original address for signature verification
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

  const startGame = async () => {
    if (!isConnected) {
      alert('Please connect your wallet to start the game');
      return;
    }
    
    if (chainId !== 10143) {
      console.log('Wrong network detected for game start:', chainId, 'Expected: 10143');
      alert('Please switch to Monad Testnet (Chain ID: 10143) to play!');
      try {
        console.log('Attempting to switch to Monad Testnet for game...');
        await switchChain({ chainId: 10143 });
        
        // Wait a moment for the chain to switch
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if switch was successful
        if (chainId !== 10143) {
          alert('Network switch failed. Please switch to Monad Testnet manually and try again.');
          return;
        }
      } catch (switchError) {
        console.error('Failed to switch chain for game:', switchError);
        alert('Failed to switch to Monad Testnet. Please switch manually and try again.');
        return;
      }
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
      console.log('Wrong network detected for claim:', chainId, 'Expected: 10143');
      alert('Please switch to Monad Testnet (Chain ID: 10143) to claim chest!');
      try {
        console.log('Attempting to switch to Monad Testnet for claim...');
        await switchChain({ chainId: 10143 });
        
        // Wait a moment for the chain to switch
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if switch was successful
        if (chainId !== 10143) {
          alert('Network switch failed. Please switch to Monad Testnet manually and try again.');
          return;
        }
      } catch (switchError) {
        console.error('Failed to switch chain for claim:', switchError);
        alert('Failed to switch to Monad Testnet. Please switch manually and try again.');
        return;
      }
    }

    if (!canClaimToday) {
      alert('You have already claimed your daily chest today!');
      return;
    }

    try {
      // Sign message using wagmi with fallback
      const message = `WE_CHEST:${address}:${currentYmd}`;
      const signature = await signWithWagmiOrFallback(address, message);

      // Send claim request
      const response = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: address, // Keep original address for signature verification
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
                <p>Network: {chainId === 10143 ? 'Monad Testnet ✅' : `Chain ${chainId} ❌`}</p>
                <p>Daily Game Available: {canClaimToday ? '✅ Yes' : '❌ No'}</p>
                <p>Your Tickets: {stats.tickets}/3</p>
                <p>Days Played: {stats.totalClaims}/3</p>
                {stats.tickets >= 3 && (
                  <div className="lottery-section">
                    <h3>🎰 Lottery is Open!</h3>
                    <p>You can now use your tickets to win prizes!</p>
                    <button className="lottery-btn">Open Lottery</button>
                  </div>
                )}
                {canClaimToday && chainId === 10143 && stats.tickets < 3 && (
                  <button 
                    className="claim-btn" 
                    onClick={claimChest}
                  >
                    Play Today's Game
                  </button>
                )}
                {canClaimToday && chainId !== 10143 && (
                  <p style={{color: 'orange'}}>⚠️ Please switch to Monad Testnet to play</p>
                )}
                {!canClaimToday && stats.tickets < 3 && (
                  <p>You have already played today! Come back tomorrow!</p>
                )}
              </div>
            )}
            
            <button 
              className="start-btn" 
              onClick={startGame}
              disabled={isConnected && chainId !== 10143}
            >
              {isConnected ? 
                (chainId === 10143 ? 'Start Game' : 'Switch to Monad Testnet') : 
                'Connect Wallet'
              }
            </button>
            <div className="game-info">
              <h3>How to play:</h3>
              <ul>
                <li>WASD/arrows - movement</li>
                <li>Space - jump</li>
                <li>Click blocks - mining</li>
                <li>E key - open chest (when nearby)</li>
                <li>Find the chest in 3 minutes!</li>
                <li>One game per day for 3 days</li>
                <li>Earn 1 ticket per day (max 3 tickets)</li>
                <li>After 3 days: lottery opens!</li>
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
            <div>Network</div>
            <div>{chainId === 10143 ? "Monad Testnet ✅" : `Chain ${chainId} ❌`}</div>
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
          width={1600} 
          height={1200}
          style={{ 
            width: '1600px', 
            height: '1200px',
            maxWidth: '100%',
            maxHeight: 'calc(100vh - 200px)',
            imageRendering: 'pixelated'
          }}
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