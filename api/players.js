import { createClient } from '@vercel/postgres';

const client = createClient({
  connectionString: process.env.POSTGRES_URL,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await ensureTableExists();

    if (req.method === 'POST') {
      const { address, deltaScore = 0, deltaTickets = 0 } = req.body;
      
      if (!address) {
        return res.status(400).json({ error: 'Address is required' });
      }

      // Get or create player
      let result = await client.query(
        'SELECT * FROM players WHERE address = $1',
        [address]
      );

      if (result.rows.length === 0) {
        // Create new player
        result = await client.query(
          `INSERT INTO players (address, score, tickets, total_runs, best_score)
           VALUES ($1, $2, $3, 1, $2)
           RETURNING *`,
          [address, deltaScore, deltaTickets]
        );
      } else {
        // Update existing player
        const player = result.rows[0];
        const newScore = player.score + deltaScore;
        const newTickets = player.tickets + deltaTickets;
        const newBest = Math.max(player.best_score, deltaScore);
        
        result = await client.query(
          `UPDATE players 
           SET score = $2, tickets = $3, total_runs = total_runs + 1, best_score = $4
           WHERE address = $1
           RETURNING *`,
          [address, newScore, newTickets, newBest]
        );
      }

      return res.json(result.rows[0]);
    }

    if (req.method === 'GET') {
      const { address } = req.query;
      
      if (address) {
        const result = await client.query(
          'SELECT * FROM players WHERE address = $1',
          [address]
        );
        
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Player not found' });
        }
        
        return res.json(result.rows[0]);
      } else {
        // Get leaderboard
        const result = await client.query(
          'SELECT address, score, tickets, best_score, total_runs FROM players ORDER BY score DESC LIMIT 10'
        );
        return res.json(result.rows);
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
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
  `;
  
  await client.query(createTableQuery);
}