// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Authentication & RBAC Middlewares
// ============================================================================

const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_hospital_jwt_key_2026_dbms');
    req.user = decoded; // { userId, username, email, roles, staffId, doctorId }
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: 'Invalid, expired, or malformed authentication token.',
    });
  }
};

/**
 * Role-Based Access Control (RBAC) Guard
 * @param  {...string} allowedRoles - Names of allowed roles (e.g., 'Admin', 'Doctor')
 */
const requireRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.roles) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User profile or permissions missing.',
      });
    }

    // Admin always has universal bypass
    if (req.user.roles.includes('Admin')) {
      return next();
    }

    const hasPermission = allowedRoles.some((role) => req.user.roles.includes(role));
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Action requires one of the following roles: [${allowedRoles.join(', ')}]`,
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  requireRoles,
};
