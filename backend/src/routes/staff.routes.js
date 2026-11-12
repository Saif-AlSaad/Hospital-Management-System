// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Staff Management Routes
// ============================================================================

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query, withTransaction } = require('../db/pool');
const { authenticateToken, requireRoles } = require('../middleware/auth.middleware');

// GET /api/staff - List Staff with Department & Roles (Admin Only)
router.get('/', authenticateToken, requireRoles('Admin'), async (req, res, next) => {
  try {
    const departmentId = req.query.departmentId ? parseInt(req.query.departmentId) : null;

    let sql = `
      SELECT 
        s.staff_id,
        s.first_name,
        s.last_name,
        CONCAT(s.first_name, ' ', s.last_name) AS full_name,
        s.gender,
        s.date_of_birth,
        s.phone,
        s.email,
        s.hire_date,
        s.employment_status,
        dept.department_id,
        dept.department_name,
        u.user_id,
        u.username,
        u.is_active AS user_active,
        ARRAY_AGG(r.role_name) AS roles
      FROM staff s
      JOIN departments dept ON s.department_id = dept.department_id
      LEFT JOIN users u ON s.user_id = u.user_id
      LEFT JOIN user_roles ur ON u.user_id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.role_id
      WHERE ($1::INT IS NULL OR s.department_id = $1)
      GROUP BY 
        s.staff_id, s.first_name, s.last_name, s.gender, s.date_of_birth,
        s.phone, s.email, s.hire_date, s.employment_status, dept.department_id,
        dept.department_name, u.user_id, u.username, u.is_active
      ORDER BY s.staff_id DESC;
    `;

    const result = await query(sql, [departmentId]);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/staff - Create Staff Profile & Linked User Account (Multi-Table Transaction)
router.post('/', authenticateToken, requireRoles('Admin'), async (req, res, next) => {
  try {
    const {
      firstName, lastName, gender, dateOfBirth, phone, email,
      departmentId, roleId, username, password
    } = req.body;

    if (!firstName || !lastName || !departmentId || !phone || !email) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, department, phone, and email are mandatory.',
      });
    }

    const createdStaff = await withTransaction(async (client) => {
      let createdUserId = null;

      // 1. If username & password provided, create login account
      if (username && password) {
        const hash = await bcrypt.hash(password, 10);
        const uRes = await client.query(`
          INSERT INTO users (username, email, password_hash, is_active)
          VALUES ($1, $2, $3, TRUE)
          RETURNING user_id;
        `, [username.trim().toLowerCase(), email.trim(), hash]);

        createdUserId = uRes.rows[0].user_id;

        // Assign Role
        if (roleId) {
          await client.query(`
            INSERT INTO user_roles (user_id, role_id)
            VALUES ($1, $2);
          `, [createdUserId, roleId]);
        }
      }

      // 2. Insert into staff
      const sRes = await client.query(`
        INSERT INTO staff (
          user_id, department_id, first_name, last_name, gender,
          date_of_birth, phone, email, hire_date, employment_status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE, 'Active')
        RETURNING *;
      `, [
        createdUserId, departmentId, firstName.trim(), lastName.trim(),
        gender || 'Male', dateOfBirth || '1985-01-01', phone.trim(), email.trim()
      ]);

      return sRes.rows[0];
    });

    res.status(201).json({
      success: true,
      message: 'Staff member registered successfully.',
      staff: createdStaff,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
