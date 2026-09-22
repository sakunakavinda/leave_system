import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'leave_system_jwt_secret_key_2026_enterprise';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate a signed JWT token
 */
export const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Verify a token directly
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
};

/**
 * Middleware: Requires a valid JWT token
 */
export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No authentication token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid authentication token.' });
  }
};

/**
 * Middleware: Optional authentication (attaches user if present, proceeds otherwise)
 */
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      // Ignore token failure for optional endpoints
    }
  }
  next();
};

/**
 * Middleware: Restricts access by user role
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // super_admin always has access
    if (req.user.role === 'super_admin' || req.user.role === 'super manager') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
    }

    next();
  };
};

/**
 * Helper: Resolve branch scope for the current request
 * Returns branch_id string if scoped to a single branch, or null if unrestricted
 */
export const getBranchScope = (req) => {
  if (!req.user) return null;
  // Super admins or executives see all branches
  if (req.user.role === 'super_admin' || req.user.role === 'super manager') {
    return null;
  }
  // Branch managers are scoped to their branch
  if (req.user.branch_id) {
    return req.user.branch_id;
  }
  return null;
};
