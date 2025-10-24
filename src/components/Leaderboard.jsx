import React, { useState, useEffect } from 'react';

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('tickets');

  useEffect(() => {
    fetchLeaderboard();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchLeaderboard, 30000);
    
    return () => clearInterval(interval);
  }, [type]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/leaderboard?type=${type}&limit=20`);
      const data = await response.json();
      
      if (data.success) {
        setLeaderboard(data.leaderboard);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address) => {
    if (!address) return 'Guest';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'tickets': return 'Tickets';
      case 'claims': return 'Total Claims';
      case 'recent': return 'Recent Claims';
      default: return 'Tickets';
    }
  };

  if (loading) {
    return (
      <div className="leaderboard-container">
        <h2>🏆 Leaderboard</h2>
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="leaderboard-container">
      <h2>🏆 Leaderboard</h2>
      
      <div className="leaderboard-tabs">
        <button 
          className={type === 'tickets' ? 'active' : ''} 
          onClick={() => setType('tickets')}
        >
          Tickets
        </button>
        <button 
          className={type === 'claims' ? 'active' : ''} 
          onClick={() => setType('claims')}
        >
          Total Claims
        </button>
        <button 
          className={type === 'recent' ? 'active' : ''} 
          onClick={() => setType('recent')}
        >
          Recent
        </button>
      </div>

      {stats && (
        <div className="leaderboard-stats">
          <div className="stat">
            <span className="stat-label">Total Players:</span>
            <span className="stat-value">{stats.total_players}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Total Tickets:</span>
            <span className="stat-value">{stats.total_tickets || 0}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Total Claims:</span>
            <span className="stat-value">{stats.total_claims || 0}</span>
          </div>
        </div>
      )}

      <div className="leaderboard-list">
        {leaderboard.length === 0 ? (
          <div className="no-data">No players yet. Be the first!</div>
        ) : (
          leaderboard.map((player, index) => (
            <div key={player.address} className="leaderboard-item">
              <div className="rank">#{index + 1}</div>
              <div className="player-info">
                <div className="address">{formatAddress(player.address)}</div>
                <div className="player-stats">
                  <span>Tickets: {player.tickets || 0}</span>
                  <span>Claims: {player.total_claims || 0}</span>
                  <span>First: {player.first_claim_date || 'N/A'}</span>
                  <span>Last: {player.last_claim_date || 'N/A'}</span>
                </div>
              </div>
              <div className="main-value">
                {type === 'tickets' && (player.tickets || 0)}
                {type === 'claims' && (player.total_claims || 0)}
                {type === 'recent' && (player.last_claim_date || 'N/A')}
              </div>
            </div>
          ))
        )}
      </div>

      <button className="refresh-btn" onClick={fetchLeaderboard}>
        🔄 Refresh
      </button>
    </div>
  );
}
