export const config = { runtime: "nodejs" };

import { createPool } from '@vercel/postgres';
import { lenientRateLimit } from './utils/rateLimit.js';

const pool = createPool({
  connectionString: process.env.POSTGRES_URL,
});

export default async function handler(req, res) {
  // Apply rate limiting first
  const rateLimitResult = lenientRateLimit(req, res);
  if (rateLimitResult) {
    return rateLimitResult; // Rate limit exceeded, response already sent
  }

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const stats = await getGameStats();
    return res.json(stats);
  } catch (error) {
    console.error('Stats API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getGameStats() {
  const playerStats = await pool.query(`
    SELECT 
      COUNT(*) as total_players,
      SUM(tickets) as total_tickets,
      SUM(score) as total_score,
      AVG(score) as average_score,
      MAX(score) as highest_score,
      SUM(total_runs) as total_runs,
      COUNT(CASE WHEN updated_at >= CURRENT_DATE THEN 1 END) as active_today,
      COUNT(CASE WHEN updated_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as active_this_week
    FROM players
  `);

  const topPlayers = await pool.query(`
    SELECT address, score, tickets, best_score
    FROM players 
    ORDER BY score DESC 
    LIMIT 5
  `);

  const dailyActivity = await pool.query(`
    SELECT 
      DATE(updated_at) as date,
      COUNT(*) as players,
      SUM(score) as total_score,
      SUM(tickets) as total_tickets
    FROM players 
    WHERE updated_at >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY DATE(updated_at)
    ORDER BY date DESC
  `);

  const stats = playerStats.rows[0];
  
  return {
    overview: {
      totalPlayers: parseInt(stats.total_players) || 0,
      totalTickets: parseInt(stats.total_tickets) || 0,
      totalScore: parseInt(stats.total_score) || 0,
      averageScore: parseFloat(stats.average_score) || 0,
      highestScore: parseInt(stats.highest_score) || 0,
      totalRuns: parseInt(stats.total_runs) || 0,
      activeToday: parseInt(stats.active_today) || 0,
      activeThisWeek: parseInt(stats.active_this_week) || 0
    },
    topPlayers: topPlayers.rows.map(player => ({
      address: player.address,
      displayAddress: formatAddress(player.address),
      score: player.score,
      tickets: player.tickets,
      bestScore: player.best_score
    })),
    dailyActivity: dailyActivity.rows.map(day => ({
      date: day.date,
      players: parseInt(day.players),
      totalScore: parseInt(day.total_score),
      totalTickets: parseInt(day.total_tickets)
    })),
    generatedAt: new Date().toISOString()
  };
}

function formatAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}