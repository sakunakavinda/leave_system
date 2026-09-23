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

export const ROLES = {
  ADMIN: 'admin',
  BRANCH_MANAGER: 'branch_manager',
  HR_OFFICER: 'hr_officer'
};

export const isAdminRole = (role) => ['super_admin', 'super manager', 'admin'].includes(role);
export const isBranchManagerRole = (role) => ['branch_manager', 'manager'].includes(role);
export const isHrOfficerRole = (role) => ['hr_officer', 'hr'].includes(role);

/**
 * Middleware: Restricts access by user role
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Admins always have access
    if (isAdminRole(req.user.role)) {
      return next();
    }

    const userRole = req.user.role;
    const matches = allowedRoles.some(allowed => {
      if (allowed === 'admin') return isAdminRole(userRole);
      if (allowed === 'branch_manager' || allowed === 'manager') return isBranchManagerRole(userRole);
      if (allowed === 'hr_officer' || allowed === 'hr') return isHrOfficerRole(userRole);
      return userRole === allowed;
    });

    if (!matches) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
    }

    next();
  };
};

/**
 * Middleware: Restricts access by granular user permission
 */
export const requirePermission = (permissionKey) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Admins always have all capabilities
    if (isAdminRole(req.user.role)) {
      return next();
    }

    const perms = req.user.permissions;
    if (perms && (perms['*'] || perms[permissionKey] === true)) {
      return next();
    }

    return res.status(403).json({
      error: `Forbidden: Missing required capability '${permissionKey}'`
    });
  };
};

/**
 * Helper: Resolve branch scope for the current request
 * Returns branch_id string if scoped to a single branch, or null if unrestricted
 */
export const getBranchScope = (req) => {
  if (!req.user) return null;
  // Admins see all branches
  if (isAdminRole(req.user.role)) {
    return null;
  }
  // Branch managers and HR officers are scoped to their branch
  if (req.user.branch_id) {
    return req.user.branch_id;
  }
  return null;
};
