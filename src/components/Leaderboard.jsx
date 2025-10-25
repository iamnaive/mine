import React, { useState, useEffect } from 'react';

export default function Leaderboard({ loadedAssets = {} }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortType, setSortType] = useState('tickets');

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
  }, [sortType]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/leaderboard?type=${sortType}&limit=20`);
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
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="leaderboard-container">

      <div className="sort-buttons">
        <button 
          className={`graphic-btn btn-sort ${sortType === 'tickets' ? 'active' : ''}`}
          onClick={() => setSortType('tickets')}
        >
          <img 
            src={loadedAssets.ui_tickets?.src || '/images/tickets.png'} 
            alt="Tickets" 
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </button>
        <button 
          className={`graphic-btn btn-sort ${sortType === 'points' ? 'active' : ''}`}
          onClick={() => setSortType('points')}
        >
          <img 
            src={loadedAssets.ui_points?.src || '/images/points.png'} 
            alt="Points" 
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </button>
        <button 
          className={`graphic-btn btn-sort ${sortType === 'best_score' ? 'active' : ''}`}
          onClick={() => setSortType('best_score')}
        >
          <img 
            src={loadedAssets.ui_best?.src || '/images/Best.png'} 
            alt="Best Score" 
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </button>
      </div>

      <div className="leaderboard-table">
            <div className="table-header">
              <div className="col-rank">
                <img 
                  src={loadedAssets.ui_rank?.src || '/images/rank.png'} 
                  alt="Rank" 
                  style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                />
              </div>
              <div className="col-address">Address</div>
              <div className="col-tickets">Tickets</div>
              <div className="col-points">Points</div>
              <div className="col-best">Best</div>
            </div>
        
        {leaderboard.length === 0 ? (
          <div className="no-data">No players yet. Be the first!</div>
        ) : (
            leaderboard.map((player, index) => (
              <div key={player.address} className="table-row">
                <div className="col-rank">
                  <div className="btn-rank">
                    <img 
                      src={loadedAssets.ui_rank?.src || '/images/rank.png'} 
                      alt="Rank" 
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                    <span style={{ position: 'absolute', zIndex: 1 }}>#{index + 1}</span>
                  </div>
                </div>
                <div className="col-address">{formatAddress(player.address)}</div>
                <div className="col-tickets">{player.tickets || 0}</div>
                <div className="col-points">{player.total_points || 0}</div>
                <div className="col-best">{player.best_score || 0}</div>
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
