// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Authentication & Enterprise RBAC Middlewares
// ============================================================================

const jwt = require('jsonwebtoken');
const { STAKEHOLDER_ROLES, hasPermission } = require('../config/roles.config');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_hospital_jwt_key_2026_dbms';

/**
 * Validates JWT bearer token and injects stakeholder identity into request context.
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      code: 'AUTH_TOKEN_MISSING',
      message: 'Access denied. No authentication token provided.',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userId, username, email, role, roles, staffId, doctorId, departmentId }
    req.userId = decoded.userId;
    req.userRole = decoded.role || (decoded.roles && decoded.roles[0]) || 'User';
    req.staffId = decoded.staffId || null;
    req.doctorId = decoded.doctorId || null;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      code: 'AUTH_TOKEN_INVALID',
      message: 'Invalid, expired, or malformed authentication token. Please sign in again.',
    });
  }
};

/**
 * Role-Based Access Control (RBAC) Guard
 * Validates whether the authenticated stakeholder possesses at least one of the permitted roles.
 * @param {...string|string[]} allowedRoles - Permitted roles (e.g., 'Admin', 'Doctor')
 */
const requireRoles = (...allowedRoles) => {
  const flattenedRoles = allowedRoles.flat();

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHENTICATED',
        message: 'Authentication required before permission check.',
      });
    }

    const userRoles = req.user.roles || (req.user.role ? [req.user.role] : []);

    // Administrator has universal administrative bypass
    if (userRoles.includes(STAKEHOLDER_ROLES.ADMIN) || req.user.role === STAKEHOLDER_ROLES.ADMIN) {
      return next();
    }

    const hasAllowedRole = flattenedRoles.some((role) => userRoles.includes(role));

    if (!hasAllowedRole) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_ROLE',
        message: `Access denied. Action requires one of the following roles: [${flattenedRoles.join(', ')}].`,
        userRole: req.user.role || userRoles[0] || 'Unknown',
        requiredRoles: flattenedRoles,
      });
    }

    next();
  };
};

/**
 * Fine-grained capability permission guard.
 * @param {...string} requiredPermissions - e.g. 'CONDUCT_CONSULTATION', 'GENERATE_INVOICE'
 */
const requirePermissions = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const primaryRole = req.user.role || (req.user.roles && req.user.roles[0]);

    if (primaryRole === STAKEHOLDER_ROLES.ADMIN) {
      return next();
    }

    const hasAll = requiredPermissions.every((perm) => hasPermission(primaryRole, perm));
    if (!hasAll) {
      return res.status(403).json({
        success: false,
        code: 'FORBIDDEN_PERMISSION',
        message: `Forbidden. You lack the necessary permissions: [${requiredPermissions.join(', ')}].`,
        requiredPermissions,
      });
    }

    next();
  };
};

/**
 * Contextual Data Isolation Guard for Doctors
 * Scopes outpatient queues and consultations to the requesting physician unless Admin.
 */
const scopeDoctorContext = (req, res, next) => {
  if (req.user && req.user.role === STAKEHOLDER_ROLES.DOCTOR) {
    if (!req.user.doctorId) {
      return res.status(403).json({
        success: false,
        message: 'Doctor profile not linked to this user account.',
      });
    }
    req.scopedDoctorId = req.user.doctorId;
  }
  next();
};

module.exports = {
  authenticateToken,
  requireRoles,
  requirePermissions,
  scopeDoctorContext,
};
