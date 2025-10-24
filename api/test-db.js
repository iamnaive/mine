export const config = { runtime: "nodejs" };

import { createPool } from '@vercel/postgres';

const pool = createPool({
  connectionString: process.env.POSTGRES_URL,
});

export default async function handler(req, res) {
  try {
    console.log('Testing database connection and schema...');

    // First, let's see what columns exist
    const tableInfo = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'players' 
      ORDER BY ordinal_position;
    `);

    console.log('Current table structure:', tableInfo.rows);

    // Try to add the missing column
    try {
      await pool.query(`
        ALTER TABLE players 
        ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0;
      `);
      console.log('✓ total_points column added successfully');
    } catch (alterError) {
      console.log('Error adding column:', alterError.message);
    }

    // Try to add other missing columns
    try {
      await pool.query(`
        ALTER TABLE players 
        ADD COLUMN IF NOT EXISTS total_claims INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS best_score INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS first_claim_date VARCHAR(10),
        ADD COLUMN IF NOT EXISTS last_claim_date VARCHAR(10);
      `);
      console.log('✓ Other columns added successfully');
    } catch (alterError) {
      console.log('Error adding other columns:', alterError.message);
    }

    // Check the table structure again
    const updatedTableInfo = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'players' 
      ORDER BY ordinal_position;
    `);

    console.log('Updated table structure:', updatedTableInfo.rows);

    return res.json({
      success: true,
      message: 'Database test completed',
      originalStructure: tableInfo.rows,
      updatedStructure: updatedTableInfo.rows
    });

  } catch (error) {
    console.error('Database test error:', error);
    return res.status(500).json({
      success: false,
      error: 'Database test failed',
      details: error.message
    });
  }
}
