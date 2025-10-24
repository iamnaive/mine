export const config = { runtime: "nodejs" };

import { createPool } from '@vercel/postgres';
import { moderateRateLimit } from '../utils/rateLimit.js';

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
    await ensureTableExists();

    if (req.method === 'GET') {
      const { address } = req.query;
      
      if (!address) {
        return res.status(400).json({ 
          success: false,
          error: 'Address parameter is required' 
        });
      }

      // Generate new nonce
      const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const issuedAt = new Date().toISOString();
      const expirationTime = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes
      
      // Store nonce in database
      await pool.query(
        'INSERT INTO auth_nonces (address, nonce, issued_at, expires_at) VALUES ($1, $2, $3, $4)',
        [address.toLowerCase(), nonce, issuedAt, expirationTime]
      );

      const domain = process.env.NEXT_PUBLIC_DOMAIN || 'mine-kappa-vert.vercel.app';
      console.log('Nonce API - domain used:', domain);
      
      return res.json({
        success: true,
        nonce,
        domain,
        chainId: 10143,
        issuedAt,
        expirationTime
      });
    }

    if (req.method === 'POST') {
      const { address, nonce } = req.body;
      
      if (!address || !nonce) {
        return res.status(400).json({ 
          success: false,
          error: 'Address and nonce are required' 
        });
      }

      // Verify and consume nonce
      const result = await pool.query(
        'SELECT * FROM auth_nonces WHERE address = $1 AND nonce = $2 AND expires_at > NOW()',
        [address.toLowerCase(), nonce]
      );

      if (result.rows.length === 0) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid or expired nonce' 
        });
      }

      // Delete used nonce
      await pool.query(
        'DELETE FROM auth_nonces WHERE address = $1 AND nonce = $2',
        [address.toLowerCase(), nonce]
      );

      return res.json({
        success: true,
        message: 'Nonce verified and consumed'
      });
    }

    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });

  } catch (error) {
    console.error('Nonce API Error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error'
    });
  }
}

async function ensureTableExists() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS auth_nonces (
      id SERIAL PRIMARY KEY,
      address VARCHAR(42) NOT NULL,
      nonce VARCHAR(32) NOT NULL,
      issued_at TIMESTAMP NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(address, nonce)
    );
    
    CREATE INDEX IF NOT EXISTS idx_auth_nonces_address ON auth_nonces(address);
    CREATE INDEX IF NOT EXISTS idx_auth_nonces_expires ON auth_nonces(expires_at);
    
    -- Clean up expired nonces
    DELETE FROM auth_nonces WHERE expires_at < NOW();
  `;
  
  await pool.query(createTableQuery);
}
