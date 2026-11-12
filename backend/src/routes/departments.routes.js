// ============================================================================
// HOSPITAL MANAGEMENT SYSTEM (HMS)
// Department Management Routes
// ============================================================================

const express = require('express');
const router = express.Router();
const { query } = require('../db/pool');
const { authenticateToken, requireRoles } = require('../middleware/auth.middleware');

// GET /api/departments - All departments with head doctor and active metrics
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const sql = `
      SELECT 
        dept.*,
        CONCAT(s.first_name, ' ', s.last_name) AS head_doctor_name,
        d.specialization AS head_doctor_specialization,
        COUNT(DISTINCT doc.doctor_id) AS total_doctors,
        COUNT(DISTINCT w.ward_id) AS total_wards,
        COALESCE(SUM(w.total_beds), 0) AS total_allocated_beds
      FROM departments dept
      LEFT JOIN doctors d ON dept.head_doctor_id = d.doctor_id
      LEFT JOIN staff s ON d.staff_id = s.staff_id
      LEFT JOIN doctors doc ON dept.department_id = doc.department_id AND doc.is_active = TRUE
      LEFT JOIN wards w ON dept.department_id = w.department_id AND w.is_active = TRUE
      WHERE dept.is_active = TRUE
      GROUP BY dept.department_id, s.first_name, s.last_name, d.specialization
      ORDER BY dept.department_name;
    `;

    const result = await query(sql);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/departments - Create Department
router.post('/', authenticateToken, requireRoles('Admin'), async (req, res, next) => {
  try {
    const { departmentName, code, description, headDoctorId } = req.body;

    if (!departmentName || !code) {
      return res.status(400).json({
        success: false,
        message: 'Department name and unique code are required.',
      });
    }

    const result = await query(`
      INSERT INTO departments (department_name, code, description, head_doctor_id, is_active)
      VALUES ($1, $2, $3, $4, TRUE)
      RETURNING *;
    `, [departmentName.trim(), code.toUpperCase().trim(), description || null, headDoctorId || null]);

    res.status(201).json({
      success: true,
      message: 'Department created successfully.',
      department: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/departments/:id - Update Department
router.put('/:id', authenticateToken, requireRoles('Admin'), async (req, res, next) => {
  try {
    const departmentId = parseInt(req.params.id);
    const { departmentName, description, headDoctorId } = req.body;

    const result = await query(`
      UPDATE departments
      SET department_name = COALESCE($1, department_name),
          description = COALESCE($2, description),
          head_doctor_id = COALESCE($3, head_doctor_id),
          updated_at = CURRENT_TIMESTAMP
      WHERE department_id = $4
      RETURNING *;
    `, [departmentName, description, headDoctorId, departmentId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Department not found.' });
    }

    res.json({
      success: true,
      message: 'Department updated successfully.',
      department: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
