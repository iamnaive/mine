export const config = { runtime: "nodejs" };

import { createPool } from '@vercel/postgres';

const pool = createPool({
  connectionString: process.env.POSTGRES_URL,
});

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Simple auth check (you can add more security if needed)
  const { secret } = req.body;
  if (secret !== 'migrate-db-2024') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('Starting database migration...');

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

    // Execute migrations
    await pool.query(createPlayersTable);
    console.log('✓ Players table created/verified');
    
    await pool.query(addMissingColumns);
    console.log('✓ Missing columns added');
    
    await pool.query(createIndexes);
    console.log('✓ Indexes created');

    // Verify the table structure
    const tableInfo = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'players' 
      ORDER BY ordinal_position;
    `);

    console.log('Table structure:', tableInfo.rows);

    return res.json({
      success: true,
      message: 'Database migration completed successfully',
      tableStructure: tableInfo.rows
    });

  } catch (error) {
    console.error('Migration error:', error);
    return res.status(500).json({
      success: false,
      error: 'Migration failed',
      details: error.message
    });
  }
}
