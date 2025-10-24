export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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
