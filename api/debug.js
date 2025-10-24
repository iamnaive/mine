export const config = { runtime: "nodejs" };

import { createPool } from '@vercel/postgres';

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
    if (req.method === 'GET') {
      // Check database connection
      const testQuery = await pool.query('SELECT NOW() as current_time');
      
      // Get all player records
      const playersQuery = await pool.query(`
        SELECT address, score, tickets, total_runs, best_score, created_at, updated_at 
        FROM players 
        ORDER BY score DESC 
        LIMIT 20
      `);
      
      // Get statistics
      const statsQuery = await pool.query(`
        SELECT 
          COUNT(*) as total_players,
          SUM(score) as total_score,
          SUM(tickets) as total_tickets,
          AVG(score) as avg_score,
          MAX(score) as max_score
        FROM players
      `);

      return res.json({
        success: true,
        database_connection: 'OK',
        current_time: testQuery.rows[0].current_time,
        players: playersQuery.rows,
        stats: statsQuery.rows[0]
      });
    }

    if (req.method === 'POST') {
      // Test record
      const { test_address = 'test_' + Date.now() } = req.body;
      
      const result = await pool.query(`
        INSERT INTO players (address, score, tickets, total_runs, best_score)
        VALUES ($1, 100, 1, 1, 100)
        RETURNING *
      `, [test_address]);

      return res.json({
        success: true,
        message: 'Test record created',
        record: result.rows[0]
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Debug API Error:', error);
    return res.status(500).json({ 
      error: 'Database error', 
      details: error.message,
      connection_string: process.env.POSTGRES_URL ? 'Set' : 'Not set'
    });
  }
}
