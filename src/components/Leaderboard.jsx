import React, { useState, useEffect } from 'react';

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('score');

  useEffect(() => {
    fetchLeaderboard();
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
      case 'score': return 'Total Score';
      case 'tickets': return 'Tickets';
      case 'best': return 'Best Score';
      case 'runs': return 'Total Runs';
      default: return 'Score';
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
          className={type === 'score' ? 'active' : ''} 
          onClick={() => setType('score')}
        >
          Total Score
        </button>
        <button 
          className={type === 'tickets' ? 'active' : ''} 
          onClick={() => setType('tickets')}
        >
          Tickets
        </button>
        <button 
          className={type === 'best' ? 'active' : ''} 
          onClick={() => setType('best')}
        >
          Best Score
        </button>
        <button 
          className={type === 'runs' ? 'active' : ''} 
          onClick={() => setType('runs')}
        >
          Total Runs
        </button>
      </div>

      {stats && (
        <div className="leaderboard-stats">
          <div className="stat">
            <span className="stat-label">Total Players:</span>
            <span className="stat-value">{stats.total_players}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Total Score:</span>
            <span className="stat-value">{stats.total_score?.toLocaleString() || 0}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Total Tickets:</span>
            <span className="stat-value">{stats.total_tickets || 0}</span>
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
                  <span>Score: {player.score?.toLocaleString() || 0}</span>
                  <span>Tickets: {player.tickets || 0}</span>
                  <span>Best: {player.best_score?.toLocaleString() || 0}</span>
                  <span>Runs: {player.total_runs || 0}</span>
                </div>
              </div>
              <div className="main-value">
                {type === 'score' && (player.score?.toLocaleString() || 0)}
                {type === 'tickets' && (player.tickets || 0)}
                {type === 'best' && (player.best_score?.toLocaleString() || 0)}
                {type === 'runs' && (player.total_runs || 0)}
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
