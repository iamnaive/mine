export const config = { runtime: "nodejs" };

import { createPool } from '@vercel/postgres';
import { recoverMessageAddress } from 'viem';

const pool = createPool({
  connectionString: process.env.POSTGRES_URL,
});

export default async function handler(req, res) {
  // Restrict CORS to specific domains
  const allowedOrigins = [
    'https://your-app.vercel.app',
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

    if (req.method === 'GET') {
      // Get lottery status and available prizes
      const { address } = req.query;
      
      if (address) {
        // Get player's lottery status
        const playerResult = await pool.query(
          'SELECT tickets, total_claims FROM players WHERE address = $1',
          [address.toLowerCase()]
        );
        
        if (playerResult.rows.length === 0) {
          return res.status(404).json({ error: 'Player not found' });
        }
        
        const player = playerResult.rows[0];
        const canPlayLottery = player.tickets >= 3;
        
        // Get player's lottery history
        const lotteryResult = await pool.query(
          'SELECT * FROM lottery_claims WHERE address = $1 ORDER BY created_at DESC',
          [address.toLowerCase()]
        );
        
        return res.json({
          success: true,
          canPlayLottery,
          tickets: player.tickets,
          totalClaims: player.total_claims,
          lotteryHistory: lotteryResult.rows
        });
      } else {
        // Get all lottery prizes and stats
        const prizesResult = await pool.query(
          'SELECT * FROM lottery_prizes ORDER BY cost ASC'
        );
        
        const statsResult = await pool.query(`
          SELECT 
            COUNT(*) as total_claims,
            SUM(tickets_spent) as total_tickets_spent,
            COUNT(DISTINCT address) as unique_players
          FROM lottery_claims
        `);
        
        return res.json({
          success: true,
          prizes: prizesResult.rows,
          stats: statsResult.rows[0]
        });
      }
    }

    if (req.method === 'POST') {
      // Play lottery
      const { address, prizeId, signature, nonce } = req.body;
      
      if (!address || !prizeId || !signature || !nonce) {
        return res.status(400).json({ 
          success: false,
          error: 'Address, prizeId, signature, and nonce are required' 
        });
      }

      // Verify nonce first
      const nonceResult = await pool.query(
        'SELECT * FROM auth_nonces WHERE address = $1 AND nonce = $2 AND expires_at > NOW()',
        [address.toLowerCase(), nonce]
      );

      if (nonceResult.rows.length === 0) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid or expired nonce' 
        });
      }

      // Verify signature with enhanced message format
      const domain = process.env.NEXT_PUBLIC_DOMAIN || 'localhost:3000';
      const chainId = 10143;
      const issuedAt = nonceResult.rows[0].issued_at;
      const message = `${domain} wants you to sign in with your Ethereum account:
${address}

Claim lottery prize ${prizeId}

URI: https://${domain}
Version: 1
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${issuedAt}`;

      let recoveredAddress;
      try {
        recoveredAddress = await recoverMessageAddress({
          message,
          signature
        });
      } catch (error) {
        console.error('Signature verification failed:', error);
        return res.status(400).json({ 
          success: false,
          error: 'Invalid signature' 
        });
      }

      // Consume nonce
      await pool.query(
        'DELETE FROM auth_nonces WHERE address = $1 AND nonce = $2',
        [address.toLowerCase(), nonce]
      );

      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        return res.status(400).json({ error: 'Signature does not match address' });
      }

      // Check if player has enough tickets
      const playerResult = await pool.query(
        'SELECT tickets FROM players WHERE address = $1',
        [address.toLowerCase()]
      );
      
      if (playerResult.rows.length === 0) {
        return res.status(404).json({ error: 'Player not found' });
      }
      
      const player = playerResult.rows[0];
      if (player.tickets < 3) {
        return res.status(400).json({ error: 'Not enough tickets. Need 3 tickets to play lottery.' });
      }

      // Get prize info
      const prizeResult = await pool.query(
        'SELECT * FROM lottery_prizes WHERE id = $1',
        [prizeId]
      );
      
      if (prizeResult.rows.length === 0) {
        return res.status(404).json({ error: 'Prize not found' });
      }
      
      const prize = prizeResult.rows[0];
      
      // Check if player has enough tickets for this prize
      if (player.tickets < prize.cost) {
        return res.status(400).json({ error: `Not enough tickets. Need ${prize.cost} tickets for this prize.` });
      }

      // Create lottery claim
      const claimResult = await pool.query(
        `INSERT INTO lottery_claims (address, prize_id, prize_name, tickets_spent, signature)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [address.toLowerCase(), prizeId, prize.name, prize.cost, signature]
      );

      // Update player's tickets
      await pool.query(
        'UPDATE players SET tickets = tickets - $1 WHERE address = $2',
        [prize.cost, address.toLowerCase()]
      );

      return res.json({
        success: true,
        message: 'Prize claimed successfully!',
        claim: claimResult.rows[0],
        remainingTickets: player.tickets - prize.cost
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Lottery API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

async function ensureTablesExist() {
  // Create lottery_prizes table
  const createPrizesTable = `
    CREATE TABLE IF NOT EXISTS lottery_prizes (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      cost INTEGER NOT NULL,
      available BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Create lottery_claims table
  const createClaimsTable = `
    CREATE TABLE IF NOT EXISTS lottery_claims (
      id SERIAL PRIMARY KEY,
      address VARCHAR(42) NOT NULL,
      prize_id INTEGER NOT NULL,
      prize_name VARCHAR(100) NOT NULL,
      tickets_spent INTEGER NOT NULL,
      signature TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (prize_id) REFERENCES lottery_prizes(id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_lottery_claims_address ON lottery_claims(address);
    CREATE INDEX IF NOT EXISTS idx_lottery_claims_prize ON lottery_claims(prize_id);
  `;

  // Insert default prizes if they don't exist
  const insertDefaultPrizes = `
    INSERT INTO lottery_prizes (name, description, cost) 
    VALUES 
      ('Small Prize', 'A small reward for your efforts', 1),
      ('Medium Prize', 'A decent reward for dedicated players', 2),
      ('Grand Prize', 'The ultimate reward for the most dedicated', 3)
    ON CONFLICT DO NOTHING;
  `;
  
  await pool.query(createPrizesTable);
  await pool.query(createClaimsTable);
  await pool.query(insertDefaultPrizes);
}
