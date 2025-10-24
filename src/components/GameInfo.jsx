import React from 'react';

const GameInfo = () => {
  return (
    <div className="game-info">
      <div className="info-card">
        <h3>🔗 Monad Testnet</h3>
        <p>This game runs exclusively on Monad Testnet</p>
        <ul>
          <li>Chain ID: 10143</li>
          <li>Get test MON from faucet</li>
          <li>No real money involved</li>
        </ul>
      </div>
      
      <div className="info-card">
        <h3>🎫 Ticket System</h3>
        <p>Mine for 3 days, 1 run per day, 3 minutes per run</p>
        <ul>
          <li>100 points = 1 ticket</li>
          <li>Daily reset at midnight</li>
          <li>Progressive chest spawn rates</li>
        </ul>
      </div>
      
      <div className="info-card">
        <h3>💎 Block Types</h3>
        <p>Different blocks give different rewards</p>
        <ul>
          <li>🗿 Stone: 2 points</li>
          <li>⚒️ Iron: 10 points</li>
          <li>🪙 Gold: 25 points</li>
          <li>💎 Diamond: 100 points</li>
        </ul>
      </div>
      
      <div className="info-card">
        <h3>🎮 Controls</h3>
        <p>How to play the game</p>
        <ul>
          <li>WASD/Arrows: Move</li>
          <li>Space: Jump</li>
          <li>Click: Mine blocks</li>
          <li>Mobile: Touch controls</li>
        </ul>
      </div>
      
      <div className="info-card">
        <h3>🏆 Chest System</h3>
        <p>Find chests for bonus rewards</p>
        <ul>
          <li>Base chance: 10%</li>
          <li>Increases by 30% per minute</li>
          <li>Max chance: 100%</li>
          <li>4 rarity levels</li>
        </ul>
      </div>
    </div>
  );
};

export default GameInfo;
