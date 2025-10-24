import { createPool } from '@vercel/postgres';
import { recoverMessageAddress } from 'viem';

const pool = createPool({
  connectionString: process.env.POSTGRES_URL,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await ensureTablesExist();

    if (req.method === 'GET') {
      // Check if user already claimed today
      const { address, ymd } = req.query;
      
      if (!address || !ymd) {
        return res.status(400).json({ error: 'Address and ymd are required' });
      }

      const result = await pool.query(
        'SELECT * FROM chest_claims WHERE address = $1 AND ymd = $2',
        [address, ymd]
      );

      return res.json({
        claimed: result.rows.length > 0,
        claim: result.rows[0] || null
      });
    }

    if (req.method === 'POST') {
      const { address, ymd, signature } = req.body;
      
      if (!address || !ymd || !signature) {
        return res.status(400).json({ error: 'Address, ymd, and signature are required' });
      }

      // Verify signature
      const message = `WE_CHEST:${address}:${ymd}`;
      let recoveredAddress;
      
      try {
        recoveredAddress = await recoverMessageAddress({
          message,
          signature
        });
      } catch (error) {
        return res.status(400).json({ error: 'Invalid signature' });
      }

      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        return res.status(400).json({ error: 'Signature does not match address' });
      }

      // Check if already claimed today
      const existingClaim = await pool.query(
        'SELECT * FROM chest_claims WHERE address = $1 AND ymd = $2',
        [address, ymd]
      );

      if (existingClaim.rows.length > 0) {
        return res.json({
          success: false,
          status: 'already_claimed',
          message: 'Chest already claimed today',
          tickets: existingClaim.rows[0].tickets_awarded
        });
      }

      // Create new claim
      const claimResult = await pool.query(
        `INSERT INTO chest_claims (address, ymd, signature, tickets_awarded)
         VALUES ($1, $2, $3, 1)
         RETURNING *`,
        [address, ymd, signature, 1]
      );

      // Update or create player record
      let playerResult = await pool.query(
        'SELECT * FROM players WHERE address = $1',
        [address]
      );

      if (playerResult.rows.length === 0) {
        // Create new player
        playerResult = await pool.query(
          `INSERT INTO players (address, tickets, total_claims, first_claim_date)
           VALUES ($1, 1, 1, $2)
           RETURNING *`,
          [address, ymd]
        );
      } else {
        // Update existing player
        playerResult = await pool.query(
          `UPDATE players 
           SET tickets = tickets + 1, 
               total_claims = total_claims + 1,
               last_claim_date = $2
           WHERE address = $1
           RETURNING *`,
          [address, ymd]
        );
      }

      return res.json({
        success: true,
        status: 'claimed',
        message: 'Chest claimed successfully',
        tickets: playerResult.rows[0].tickets,
        claim: claimResult.rows[0]
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Claim API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function ensureTablesExist() {
  // Create players table
  const createPlayersTable = `
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

  // Create chest_claims table
  const createChestClaimsTable = `
    CREATE TABLE IF NOT EXISTS chest_claims (
      id SERIAL PRIMARY KEY,
      address VARCHAR(42) NOT NULL,
      ymd DATE NOT NULL,
      signature TEXT NOT NULL,
      tickets_awarded INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(address, ymd)
    );
    
    CREATE INDEX IF NOT EXISTS idx_chest_claims_address ON chest_claims(address);
    CREATE INDEX IF NOT EXISTS idx_chest_claims_ymd ON chest_claims(ymd);
    CREATE INDEX IF NOT EXISTS idx_chest_claims_unique ON chest_claims(address, ymd);
  `;
  
  await pool.query(createPlayersTable);
  await pool.query(createChestClaimsTable);
}
