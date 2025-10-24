import { createPool } from '@vercel/postgres';

const pool = createPool({
  connectionString: process.env.POSTGRES_URL,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await ensureTableExists();

    if (req.method === 'GET') {
      const { limit = 10, type = 'score' } = req.query;
      
      let orderBy = 'score DESC';
      if (type === 'tickets') {
        orderBy = 'tickets DESC, score DESC';
      } else if (type === 'best') {
        orderBy = 'best_score DESC, score DESC';
      } else if (type === 'runs') {
        orderBy = 'total_runs DESC, score DESC';
      }

      const result = await pool.query(`
        SELECT 
          address,
          score,
          tickets,
          best_score,
          total_runs,
          created_at,
          updated_at
        FROM players 
        ORDER BY ${orderBy}
        LIMIT $1
      `, [parseInt(limit)]);

      // Get total stats
      const statsResult = await pool.query(`
        SELECT 
          COUNT(*) as total_players,
          SUM(score) as total_score,
          SUM(tickets) as total_tickets,
          AVG(score) as avg_score,
          MAX(score) as max_score,
          MAX(best_score) as max_best_score
        FROM players
      `);

      return res.json({
        success: true,
        leaderboard: result.rows,
        stats: statsResult.rows[0],
        type: type,
        limit: parseInt(limit)
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Leaderboard API Error:', error);
    return res.status(500).json({ 
      error: 'Database error', 
      details: error.message 
    });
  }
}

async function ensureTableExists() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS players (
      id SERIAL PRIMARY KEY,
      address VARCHAR(42) UNIQUE NOT NULL,
      score INTEGER DEFAULT 0,
      tickets INTEGER DEFAULT 0,
      total_runs INTEGER DEFAULT 0,
      best_score INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_players_address ON players(address);
    CREATE INDEX IF NOT EXISTS idx_players_score ON players(score DESC);
    CREATE INDEX IF NOT EXISTS idx_players_tickets ON players(tickets DESC);
    CREATE INDEX IF NOT EXISTS idx_players_best_score ON players(best_score DESC);
  `;
  
  await pool.query(createTableQuery);
}