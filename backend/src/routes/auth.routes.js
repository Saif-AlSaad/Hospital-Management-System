// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Authentication Routes (Login, Profile, Credentials)
// ============================================================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db/pool');
const { authenticateToken } = require('../middleware/auth.middleware');

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username/Email and password are required.',
      });
    }

    // Explicit Parameterized SQL Query fetching user credentials and mapped roles
    const userSql = `
      SELECT 
        u.user_id,
        u.username,
        u.email,
        u.password_hash,
        u.is_active,
        s.staff_id,
        s.first_name,
        s.last_name,
        s.department_id,
        dept.department_name,
        d.doctor_id,
        ARRAY_AGG(r.role_name) AS roles
      FROM users u
      LEFT JOIN user_roles ur ON u.user_id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.role_id
      LEFT JOIN staff s ON u.user_id = s.user_id
      LEFT JOIN departments dept ON s.department_id = dept.department_id
      LEFT JOIN doctors d ON s.staff_id = d.staff_id
      WHERE (LOWER(u.username) = LOWER($1) OR LOWER(u.email) = LOWER($1))
      GROUP BY 
        u.user_id, u.username, u.email, u.password_hash, u.is_active,
        s.staff_id, s.first_name, s.last_name, s.department_id, dept.department_name, d.doctor_id;
    `;

    const result = await query(userSql, [usernameOrEmail.trim()]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.',
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Contact hospital system administrator.',
      });
    }

    // Verify bcrypt hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Incorrect password.',
      });
    }

    const payload = {
      userId: user.user_id,
      username: user.username,
      email: user.email,
      roles: user.roles.filter(Boolean),
      staffId: user.staff_id,
      doctorId: user.doctor_id,
      fullName: user.first_name ? `${user.first_name} ${user.last_name}` : user.username,
      departmentId: user.department_id,
      departmentName: user.department_name,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'super_secret_hospital_jwt_key_2026_dbms', {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    });

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: payload,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});

module.exports = router;
