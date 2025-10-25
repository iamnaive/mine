export const config = { runtime: "nodejs" };

import { createPool } from '@vercel/postgres';
import { lenientRateLimit } from './utils/rateLimit.js';

const pool = createPool({
  connectionString: process.env.POSTGRES_URL,
});

export default async function handler(req, res) {
  // Apply rate limiting first
  const rateLimitResult = lenientRateLimit(req, res);
  if (rateLimitResult) {
    return rateLimitResult; // Rate limit exceeded, response already sent
  }

  // Restrict CORS to specific domains
  const allowedOrigins = [
    'https://mine-kappa-vert.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await ensureTableExists();

    if (req.method === 'GET') {
      const { address } = req.query;
      
      if (!address) {
        return res.status(400).json({ 
          success: false,
          error: 'Address parameter is required' 
        });
      }

      // Get player data (read-only)
      const result = await pool.query(
        'SELECT * FROM players WHERE address = $1',
        [address.toLowerCase()]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'Player not found' 
        });
      }

      return res.json({
        success: true,
        player: result.rows[0]
      });
    }

    // Block all write operations
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed. Player balance can only be modified through claim/lottery APIs.' 
    });

  } catch (error) {
    console.error('Players API Error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error'
    });
  }
}

async function ensureTableExists() {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS players (
        id SERIAL PRIMARY KEY,
        address VARCHAR(42) UNIQUE NOT NULL,
        tickets INTEGER DEFAULT 0,
        total_claims INTEGER DEFAULT 0,
        total_points INTEGER DEFAULT 0,
        best_score INTEGER DEFAULT 0,
        first_claim_date VARCHAR(10),
        last_claim_date VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Add missing columns if they don't exist
    const addMissingColumns = `
      ALTER TABLE players 
      ADD COLUMN IF NOT EXISTS total_claims INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS best_score INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS first_claim_date VARCHAR(10),
      ADD COLUMN IF NOT EXISTS last_claim_date VARCHAR(10);
    `;

    // Create indexes
    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_players_address ON players(address);
      CREATE INDEX IF NOT EXISTS idx_players_tickets ON players(tickets DESC);
      CREATE INDEX IF NOT EXISTS idx_players_points ON players(total_points DESC);
      CREATE INDEX IF NOT EXISTS idx_players_best_score ON players(best_score DESC);
    `;
    
    await pool.query(createTableQuery);
    console.log('✓ Players table created/verified');
    
    await pool.query(addMissingColumns);
    console.log('✓ Missing columns added');
    
    await pool.query(createIndexes);
    console.log('✓ Indexes created');
    
  } catch (error) {
    console.error('Error ensuring table exists:', error);
    throw error;
  }
}