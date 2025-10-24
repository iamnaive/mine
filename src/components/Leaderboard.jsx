import React, { useState, useEffect } from 'react';

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchLeaderboard, 30000);
    
    // Listen for manual refresh events
    const handleRefresh = () => {
      fetchLeaderboard();
    };
    window.addEventListener('leaderboard-refresh', handleRefresh);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('leaderboard-refresh', handleRefresh);
    };
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/leaderboard?type=tickets&limit=20`);
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

      <div className="leaderboard-table">
        <div className="table-header">
          <div className="col-rank">Rank</div>
          <div className="col-address">Address</div>
          <div className="col-tickets">Tickets</div>
          <div className="col-claims">Claims</div>
          <div className="col-first">First</div>
          <div className="col-last">Last</div>
        </div>
        
        {leaderboard.length === 0 ? (
          <div className="no-data">No players yet. Be the first!</div>
        ) : (
          leaderboard.map((player, index) => (
            <div key={player.address} className="table-row">
              <div className="col-rank">#{index + 1}</div>
              <div className="col-address">{formatAddress(player.address)}</div>
              <div className="col-tickets">{player.tickets || 0}</div>
              <div className="col-claims">{player.total_claims || 0}</div>
              <div className="col-first">{player.first_claim_date || 'N/A'}</div>
              <div className="col-last">{player.last_claim_date || 'N/A'}</div>
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
