export const config = { runtime: "nodejs" };

import { createPool } from '@vercel/postgres';
import { recoverMessageAddress } from 'viem';
import { strictRateLimit } from './utils/rateLimit.js';

const pool = createPool({
  connectionString: process.env.POSTGRES_URL,
});

export default async function handler(req, res) {
  // Apply rate limiting first
  const rateLimitResult = strictRateLimit(req, res);
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
      
      console.log('Claim POST request received:', {
        address: address ? `${address.substring(0, 10)}...` : 'missing',
        ymd,
        signature: signature ? `${signature.substring(0, 20)}...` : 'missing'
      });
      
      if (!address || !ymd || !signature) {
        console.log('Missing required fields:', { address: !!address, ymd: !!ymd, signature: !!signature });
        return res.status(400).json({ 
          success: false,
          error: 'Address, ymd, and signature are required' 
        });
      }

      // Simple signature verification (working version)
      const message = `WE_CHEST:${address}:${ymd}`;
      console.log('Verifying signature for message:', message);
      
      // Verify signature
      let recoveredAddress;
      try {
        recoveredAddress = await recoverMessageAddress({
          message,
          signature
        });
      } catch (error) {
        console.error('Signature verification failed:', error);
        return res.status(400).json({ error: 'Invalid signature' });
      }

      console.log('Signature verification result:', { 
        recoveredAddress, 
        originalAddress: address,
        match: recoveredAddress.toLowerCase() === address.toLowerCase()
      });

      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        console.error('Signature does not match address:', { recoveredAddress, address });
        return res.status(400).json({ 
          success: false,
          error: 'Signature does not match address' 
        });
      }

      // Normalize address to lowercase for database operations
      const normalizedAddress = address.toLowerCase();

      // Check if already claimed today
      const existingClaim = await pool.query(
        'SELECT * FROM chest_claims WHERE address = $1 AND ymd = $2',
        [normalizedAddress, ymd]
      );

      console.log('Existing claim check:', existingClaim.rows);

      if (existingClaim.rows.length > 0) {
        return res.json({
          success: false,
          status: 'already_claimed',
          message: 'Chest already claimed today',
          tickets: existingClaim.rows[0].tickets_awarded
        });
      }

      // Use transaction for critical operations
      console.log('Starting database transaction');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        console.log('Transaction started');

        // Create new claim
        const claimResult = await client.query(
          `INSERT INTO chest_claims (address, ymd, signature, tickets_awarded)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [normalizedAddress, ymd, signature, 1]
        );

        console.log('Claim created:', claimResult.rows);
        
        // Ensure claim was created successfully
        if (claimResult.rows.length === 0) {
          throw new Error('Failed to create claim record');
        }

        // Update or create player record
        let playerResult = await client.query(
          'SELECT * FROM players WHERE address = $1',
          [normalizedAddress]
        );

        console.log('Player lookup:', playerResult.rows);

        if (playerResult.rows.length === 0) {
          // Create new player
          playerResult = await client.query(
            `INSERT INTO players (address, tickets, total_claims, first_claim_date)
             VALUES ($1, 1, 1, $2)
             RETURNING *`,
            [normalizedAddress, ymd]
          );
          console.log('New player created:', playerResult.rows);
        } else {
          // Update existing player
          playerResult = await client.query(
            `UPDATE players 
             SET tickets = tickets + 1, 
                 total_claims = total_claims + 1,
                 last_claim_date = $2
             WHERE address = $1
             RETURNING *`,
            [normalizedAddress, ymd]
          );
          console.log('Player updated:', playerResult.rows);
          
          // If no rows were updated, something went wrong
          if (playerResult.rows.length === 0) {
            throw new Error('Failed to update player record');
          }
        }

        await client.query('COMMIT');
        console.log('Transaction committed successfully');
      } catch (error) {
        console.error('Transaction error:', error);
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
        console.log('Database client released');
      }

      // Ensure we have valid data
      console.log('Final validation - playerResult:', playerResult.rows);
      console.log('Final validation - claimResult:', claimResult.rows);
      
      if (!playerResult.rows[0]) {
        console.error('Player data not found after update');
        throw new Error('Player data not found after update');
      }
      
      if (!claimResult.rows[0]) {
        console.error('Claim data not found after creation');
        throw new Error('Claim data not found after creation');
      }

      console.log('Returning success response');
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
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

async function ensureTablesExist() {
  // Create players table with proper schema
  const createPlayersTable = `
    CREATE TABLE IF NOT EXISTS players (
      id SERIAL PRIMARY KEY,
      address VARCHAR(42) UNIQUE NOT NULL,
      tickets INTEGER DEFAULT 0,
      total_claims INTEGER DEFAULT 0,
      first_claim_date VARCHAR(10),
      last_claim_date VARCHAR(10),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_players_address ON players(address);
    CREATE INDEX IF NOT EXISTS idx_players_tickets ON players(tickets DESC);
  `;

  // Add missing columns if they don't exist
  const addMissingColumns = `
    ALTER TABLE players 
    ADD COLUMN IF NOT EXISTS total_claims INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS first_claim_date VARCHAR(10),
    ADD COLUMN IF NOT EXISTS last_claim_date VARCHAR(10);
  `;

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
  
  await pool.query(createPlayersTable);
  await pool.query(addMissingColumns);
  await pool.query(createChestClaimsTable);
}
