import { createClient } from '@vercel/postgres';

const client = createClient({
  connectionString: process.env.POSTGRES_URL,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type = 'score', limit = 10 } = req.query;
    
    let query;
    let params = [parseInt(limit)];
    
    switch (type) {
      case 'score':
        query = `
          SELECT 
            address,
            score,
            tickets,
            best_score,
            total_runs,
            RANK() OVER (ORDER BY score DESC) as rank
          FROM players 
          ORDER BY score DESC 
          LIMIT $1
        `;
        break;
        
      case 'tickets':
        query = `
          SELECT 
            address,
            score,
            tickets,
            best_score,
            total_runs,
            RANK() OVER (ORDER BY tickets DESC) as rank
          FROM players 
          ORDER BY tickets DESC 
          LIMIT $1
        `;
        break;
        
      case 'best_score':
        query = `
          SELECT 
            address,
            score,
            tickets,
            best_score,
            total_runs,
            RANK() OVER (ORDER BY best_score DESC) as rank
          FROM players 
          ORDER BY best_score DESC 
          LIMIT $1
        `;
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid leaderboard type' });
    }
    
    const result = await client.query(query, params);
    
    const leaderboard = result.rows.map(row => ({
      rank: parseInt(row.rank),
      address: row.address,
      score: row.score,
      tickets: row.tickets,
      bestScore: row.best_score,
      totalRuns: row.total_runs,
      displayAddress: formatAddress(row.address)
    }));
    
    return res.json({
      type,
      limit: parseInt(limit),
      data: leaderboard,
      generatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Leaderboard API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function formatAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}