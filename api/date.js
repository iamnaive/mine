export const config = { runtime: "nodejs" };

import { lenientRateLimit } from './utils/rateLimit.js';

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

  if (req.method === 'GET') {
    // Get current UTC date
    const now = new Date();
    const utcDate = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
    const ymd = utcDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    return res.json({
      success: true,
      ymd: ymd,
      timestamp: now.toISOString(),
      timezone: 'UTC'
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
