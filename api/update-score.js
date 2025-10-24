export const config = { runtime: "nodejs" };

import { createPool } from '@vercel/postgres';
import { moderateRateLimit } from './utils/rateLimit.js';

const pool = createPool({
  connectionString: process.env.POSTGRES_URL,
});

export default async function handler(req, res) {
  // Apply rate limiting first
  const rateLimitResult = moderateRateLimit(req, res);
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await ensureTablesExist();

    if (req.method === 'POST') {
      const { address, score } = req.body;
      
      console.log('Update score request:', {
        address: address ? `${address.substring(0, 10)}...` : 'missing',
        score
      });
      
      if (!address || score === undefined) {
        return res.status(400).json({ 
          success: false,
          error: 'Address and score are required' 
        });
      }

      // Normalize address to lowercase for database operations
      const normalizedAddress = address.toLowerCase();

      // Update or create player record with score
      let playerResult = await pool.query(
        'SELECT * FROM players WHERE address = $1',
        [normalizedAddress]
      );

      if (playerResult.rows.length === 0) {
        // Create new player
        playerResult = await pool.query(
          `INSERT INTO players (address, total_points, best_score)
           VALUES ($1, $2, $3)
           RETURNING *`,
          [normalizedAddress, score, score]
        );
        console.log('New player created with score:', playerResult.rows[0]);
      } else {
        // Update existing player
        const currentPlayer = playerResult.rows[0];
        const newTotalPoints = (currentPlayer.total_points || 0) + score;
        const newBestScore = Math.max(currentPlayer.best_score || 0, score);
        
        playerResult = await pool.query(
          `UPDATE players 
           SET total_points = $2, 
               best_score = $3,
               updated_at = CURRENT_TIMESTAMP
           WHERE address = $1
           RETURNING *`,
          [normalizedAddress, newTotalPoints, newBestScore]
        );
        console.log('Player score updated:', playerResult.rows[0]);
      }

      return res.json({
        success: true,
        message: 'Score updated successfully',
        player: playerResult.rows[0]
      });
    }

    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });

  } catch (error) {
    console.error('Update score API Error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error'
    });
  }
}

async function ensureTablesExist() {
  try {
    // Create players table with proper schema
    const createPlayersTable = `
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
    
    await pool.query(createPlayersTable);
    console.log('✓ Players table created/verified');
    
    await pool.query(addMissingColumns);
    console.log('✓ Missing columns added');
    
    await pool.query(createIndexes);
    console.log('✓ Indexes created');
    
  } catch (error) {
    console.error('Error ensuring tables exist:', error);
    throw error;
  }
}

