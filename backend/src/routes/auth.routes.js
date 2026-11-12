// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Authentication & Stakeholder Identity Router
// Enterprise-Grade Identity Resolution, RBAC Tokens & Credential Management
// ============================================================================

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query } = require('../db/pool');
const { authenticateToken } = require('../middleware/auth.middleware');
const {
  resolveUserIdentityByCredential,
  resolveUserIdentityById,
  verifyPassword,
  buildStakeholderSession,
  recordAuthAudit,
} = require('../services/identity.service');
const {
  STAKEHOLDER_ROLES,
  STAKEHOLDER_PROFILES,
} = require('../config/roles.config');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_hospital_jwt_key_2026_dbms';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// ----------------------------------------------------------------------------
// POST /api/auth/login
// Stakeholder Authentication & Session Initialization
// ----------------------------------------------------------------------------
router.post('/login', async (req, res, next) => {
  try {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username/Email and password are required.',
      });
    }

    // 1. Resolve User Identity from PostgreSQL
    const userRecord = await resolveUserIdentityByCredential(usernameOrEmail);

    if (!userRecord) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User identity not found.',
      });
    }

    // 2. Check Account Status
    if (!userRecord.is_active) {
      return res.status(403).json({
        success: false,
        message: 'This hospital account has been deactivated. Please contact administration.',
      });
    }

    // 3. Verify Password Hash
    const isPasswordValid = await verifyPassword(password, userRecord.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Incorrect password.',
      });
    }

    // 4. Construct Stakeholder Profile & Permissions Matrix
    const stakeholderSession = buildStakeholderSession(userRecord);

    // 5. Sign Structured JWT Token
    const jwtPayload = {
      userId: stakeholderSession.userId,
      username: stakeholderSession.username,
      email: stakeholderSession.email,
      role: stakeholderSession.role,
      roles: stakeholderSession.roles,
      staffId: stakeholderSession.staffId,
      doctorId: stakeholderSession.doctorId,
      departmentId: stakeholderSession.department?.id || null,
    };

    const token = jwt.sign(jwtPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // 6. Record Audit Trail
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    await recordAuthAudit(stakeholderSession.userId, 'UPDATE', clientIp, {
      event: 'USER_LOGIN',
      stakeholder: stakeholderSession.role,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: `Authentication successful. Welcome, ${stakeholderSession.fullName} (${stakeholderSession.stakeholderTitle}).`,
      token,
      user: stakeholderSession,
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// GET /api/auth/me
// Live Stakeholder Profile & Active Permissions Synchronization
// ----------------------------------------------------------------------------
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    const userRecord = await resolveUserIdentityById(req.user.userId);

    if (!userRecord || !userRecord.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Session is no longer valid or user is deactivated.',
      });
    }

    const stakeholderSession = buildStakeholderSession(userRecord);

    res.json({
      success: true,
      user: stakeholderSession,
    });
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------------------------------
// GET /api/auth/stakeholders
// Master Directory of Stakeholder Definitions & Capability Matrix
// ----------------------------------------------------------------------------
router.get('/stakeholders', (req, res) => {
  res.json({
    success: true,
    stakeholders: STAKEHOLDER_PROFILES,
    roles: Object.values(STAKEHOLDER_ROLES),
  });
});

// ----------------------------------------------------------------------------
// POST /api/auth/change-password
// Self-Service Credential Update
// ----------------------------------------------------------------------------
router.post('/change-password', authenticateToken, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters in length.',
      });
    }

    const userRecord = await resolveUserIdentityById(req.user.userId);
    if (!userRecord) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = await verifyPassword(currentPassword, userRecord.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password does not match.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2;', [
      newHash,
      req.user.userId,
    ]);

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    await recordAuthAudit(req.user.userId, 'UPDATE', clientIp, {
      event: 'PASSWORD_CHANGED',
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Password successfully updated.',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
