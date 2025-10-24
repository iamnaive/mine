import { createPool } from '@vercel/postgres';

const pool = createPool({
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
          const { address, deltaTickets = 0 } = req.body;
          
          if (!address) {
            return res.status(400).json({ error: 'Address is required' });
          }

          // Get or create player
          let result = await pool.query(
            'SELECT * FROM players WHERE address = $1',
            [address]
          );

          if (result.rows.length === 0) {
            // Create new player
            result = await pool.query(
              `INSERT INTO players (address, tickets, total_claims)
               VALUES ($1, $2, 1)
               RETURNING *`,
              [address, deltaTickets]
            );
          } else {
            // Update existing player
            const player = result.rows[0];
            const newTickets = player.tickets + deltaTickets;
            
            result = await pool.query(
              `UPDATE players 
               SET tickets = $2, total_claims = total_claims + 1
               WHERE address = $1
               RETURNING *`,
              [address, newTickets]
            );
          }

          return res.json(result.rows[0]);
        }

        if (req.method === 'GET') {
          const { address } = req.query;
          
          if (address) {
            const result = await pool.query(
              'SELECT * FROM players WHERE address = $1',
              [address]
            );
            
            if (result.rows.length === 0) {
              return res.status(404).json({ error: 'Player not found' });
            }
            
            return res.json(result.rows[0]);
          } else {
            // Get all players (for debugging)
            const result = await pool.query(
              'SELECT address, tickets, total_claims, first_claim_date, last_claim_date FROM players ORDER BY tickets DESC LIMIT 50'
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
      tickets INTEGER DEFAULT 0,
      total_claims INTEGER DEFAULT 0,
      first_claim_date DATE,
      last_claim_date DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_players_address ON players(address);
    CREATE INDEX IF NOT EXISTS idx_players_tickets ON players(tickets DESC);
  `;
  
  await pool.query(createTableQuery);
}