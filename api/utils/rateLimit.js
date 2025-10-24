// Simple in-memory rate limiting utility
// In production, consider using Redis or a database for distributed rate limiting

const rateLimitStore = new Map();

export function createRateLimit(options = {}) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxRequests = 100, // max requests per window
    keyGenerator = (req) => req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, []);
    }

    const requests = rateLimitStore.get(key);
    
    // Remove requests outside the current window
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    rateLimitStore.set(key, validRequests);

    // Check if rate limit exceeded
    if (validRequests.length >= maxRequests) {
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());
      
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    // Add current request
    validRequests.push(now);
    rateLimitStore.set(key, validRequests);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', maxRequests - validRequests.length);
    res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());

    if (next) {
      next();
    }
  };
}

// Predefined rate limiters for different endpoints
export const strictRateLimit = createRateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 10, // 10 requests per 5 minutes
});

export const moderateRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 50, // 50 requests per 15 minutes
});

export const lenientRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
});

// Clean up old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  const maxAge = 60 * 60 * 1000; // 1 hour
  
  for (const [key, requests] of rateLimitStore.entries()) {
    const validRequests = requests.filter(timestamp => now - timestamp < maxAge);
    if (validRequests.length === 0) {
      rateLimitStore.delete(key);
    } else {
      rateLimitStore.set(key, validRequests);
    }
  }
}, 5 * 60 * 1000);
