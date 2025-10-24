import React from 'react';

const PlayerStats = ({ playerData, onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content stats-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Player Statistics</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="stats-grid">
            <div className="stat-card">
              <h3>🎫 Tickets</h3>
              <div className="stat-value">{playerData.tickets}</div>
            </div>
            
            <div className="stat-card">
              <h3>🏆 Total Score</h3>
              <div className="stat-value">{playerData.score}</div>
            </div>
            
            <div className="stat-card">
              <h3>⭐ Best Score</h3>
              <div className="stat-value">{playerData.bestScore}</div>
            </div>
            
            <div className="stat-card">
              <h3>🏃 Total Runs</h3>
              <div className="stat-value">{playerData.totalRuns}</div>
            </div>
            
            <div className="stat-card">
              <h3>📅 Current Day</h3>
              <div className="stat-value">{playerData.currentDay}/3</div>
            </div>
            
            <div className="stat-card">
              <h3>⏰ Runs Left</h3>
              <div className="stat-value">{playerData.runsLeft}</div>
            </div>
          </div>
          
          <div className="inventory-section">
            <h3>💎 Inventory</h3>
            <div className="inventory-grid">
              <div className="inventory-item">
                <span className="item-icon">💎</span>
                <span className="item-name">Diamonds</span>
                <span className="item-count">{playerData.inventory.diamonds || 0}</span>
              </div>
              
              <div className="inventory-item">
                <span className="item-icon">🪙</span>
                <span className="item-name">Gold</span>
                <span className="item-count">{playerData.inventory.gold || 0}</span>
              </div>
              
              <div className="inventory-item">
                <span className="item-icon">⚒️</span>
                <span className="item-name">Iron</span>
                <span className="item-count">{playerData.inventory.iron || 0}</span>
              </div>
              
              <div className="inventory-item">
                <span className="item-icon">🗿</span>
                <span className="item-name">Stone</span>
                <span className="item-count">{playerData.inventory.stone || 0}</span>
              </div>
              
              <div className="inventory-item">
                <span className="item-icon">🏆</span>
                <span className="item-name">Chests</span>
                <span className="item-count">{playerData.inventory.chests || 0}</span>
              </div>
            </div>
          </div>
          
          <div className="wallet-info">
            <h3>🔗 Wallet Address</h3>
            <div className="wallet-address">
              {playerData.address}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerStats;
