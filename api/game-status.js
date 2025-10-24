export const config = { runtime: "nodejs" };

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
    await ensureTablesExist();

    if (req.method === 'GET') {
      const { address, ymd } = req.query;
      
      if (!address || !ymd) {
        return res.status(400).json({ error: 'Address and ymd are required' });
      }

      // Check if player has any claims for today (which means they played)
      const claimResult = await pool.query(
        'SELECT * FROM chest_claims WHERE address = $1 AND ymd = $2',
        [address.toLowerCase(), ymd]
      );

      const hasPlayedToday = claimResult.rows.length > 0;

      return res.json({
        success: true,
        hasPlayedToday,
        canPlayToday: !hasPlayedToday,
        claim: claimResult.rows[0] || null
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Game Status API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

async function ensureTablesExist() {
  // Create chest_claims table
  const createChestClaimsTable = `
    CREATE TABLE IF NOT EXISTS chest_claims (
      id SERIAL PRIMARY KEY,
      address VARCHAR(42) NOT NULL,
      ymd VARCHAR(10) NOT NULL,
      signature TEXT NOT NULL,
      tickets_awarded INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(address, ymd)
    );
    
    CREATE INDEX IF NOT EXISTS idx_chest_claims_address ON chest_claims(address);
    CREATE INDEX IF NOT EXISTS idx_chest_claims_ymd ON chest_claims(ymd);
    CREATE INDEX IF NOT EXISTS idx_chest_claims_unique ON chest_claims(address, ymd);
  `;
  
  await pool.query(createChestClaimsTable);
}
