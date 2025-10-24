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
      const { limit = 10, type = 'tickets' } = req.query;
      
      let orderBy = 'tickets DESC, total_claims DESC';
      if (type === 'claims') {
        orderBy = 'total_claims DESC, tickets DESC';
      } else if (type === 'recent') {
        orderBy = 'last_claim_date DESC, tickets DESC';
      }

      const result = await pool.query(`
        SELECT 
          address,
          tickets,
          total_claims,
          first_claim_date,
          last_claim_date,
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
          SUM(tickets) as total_tickets,
          SUM(total_claims) as total_claims,
          AVG(tickets) as avg_tickets,
          MAX(tickets) as max_tickets
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
      tickets INTEGER DEFAULT 0,
      total_claims INTEGER DEFAULT 0,
      first_claim_date DATE,
      last_claim_date DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_players_address ON players(address);
    CREATE INDEX IF NOT EXISTS idx_players_tickets ON players(tickets DESC);
    CREATE INDEX IF NOT EXISTS idx_players_claims ON players(total_claims DESC);
  `;
  
  await pool.query(createTableQuery);
}