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

  if (req.method === 'GET') {
    try {
      // Test database connection
      const testQuery = await pool.query('SELECT NOW() as current_time');
      
      // Get all players
      const playersQuery = await pool.query(`
        SELECT address, tickets, total_claims, first_claim_date, last_claim_date 
        FROM players 
        ORDER BY tickets DESC 
        LIMIT 20
      `);
      
      // Get all chest claims
      const claimsQuery = await pool.query(`
        SELECT address, ymd, tickets_awarded, created_at 
        FROM chest_claims 
        ORDER BY created_at DESC 
        LIMIT 20
      `);

      return res.json({
        success: true,
        database_connection: 'OK',
        current_time: testQuery.rows[0].current_time,
        players: playersQuery.rows,
        claims: claimsQuery.rows,
        total_players: playersQuery.rows.length,
        total_claims: claimsQuery.rows.length
      });
    } catch (error) {
      console.error('Database test error:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Database error', 
        details: error.message 
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
