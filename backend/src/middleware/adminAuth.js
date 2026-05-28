require('dotenv').config();

/**
 * Simple token-based admin authentication middleware.
 * Expects: Authorization: Bearer <ADMIN_SECRET>
 */
const adminAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or invalid Authorization header. Expected: Bearer <token>',
    });
  }

  const token = authHeader.split(' ')[1];

  if (token !== process.env.ADMIN_SECRET) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid admin token.',
    });
  }

  next();
};

module.exports = adminAuth;